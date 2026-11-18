import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../db/pool';
import { env } from '../../config/env';
import {
  validationError,
  notFound,
  invalidQrFormat,
  watermarkLowConfidence,
} from '../../utils/errors';
import * as imageServiceClient from '../../services/imageServiceClient';
import * as qrSigner from '../../services/qrSigner';
import { evaluateAndLog } from './verdict';
import {
  buildTwinView,
  buildLimitedView,
  computeAllowedActions,
  RawTwin,
} from '../../services/twinView';

export const scanQrSchema = z.object({
  qr_payload: z.string().min(1),
});

export async function scanLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw validationError([{ field: 'image', message: 'Image file is required' }]);
    }

    const mockTwinCode = req.header('x-mock-twin-code') || (req.query.mock_twin_code as string);

    // Call Python image service decode
    const decodeResult = await imageServiceClient.decode(req.file.buffer, mockTwinCode);

    const confidence = decodeResult.confidence ?? 0;
    const threshold = env.WM_CONFIDENCE_THRESHOLD;

    // Check if confidence falls below threshold or not decoded
    if (!decodeResult.decoded || confidence < threshold) {
      const scanId = uuidv4();
      await pool.query(
        `INSERT INTO scan_logs (id, twin_id, scanned_by, scanner_role, method, verdict, confidence, decoded_code, reason, ip)
         VALUES ($1, NULL, $2, $3, 'WATERMARK', 'LOW_CONFIDENCE', $4, $5, 'LOW_CONFIDENCE', $6)`,
        [
          scanId,
          req.user!.id,
          req.user!.role,
          confidence,
          decodeResult.twin_code ?? null,
          req.ip,
        ],
      );

      throw watermarkLowConfidence({
        confidence,
        threshold,
        fallback_required: true,
        suggested_action: 'SWITCH_TO_QR',
        scan_id: scanId,
      });
    }

    const evaluation = await evaluateAndLog({
      twinCode: decodeResult.twin_code,
      caller: req.user!,
      method: 'WATERMARK',
      confidence,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
}

export async function scanQr(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parseRes = scanQrSchema.safeParse(req.body);
    if (!parseRes.success) {
      throw validationError(
        parseRes.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const { qr_payload } = parseRes.data;

    // A transfer QR scanned in product verify mode -> hint TRANSFER_QR
    if (qr_payload.startsWith('VTX1.')) {
      throw invalidQrFormat({ hint: 'TRANSFER_QR' });
    }

    if (!qr_payload.startsWith('VT1.')) {
      throw invalidQrFormat();
    }

    const verification = qrSigner.verify(qr_payload);

    let evaluation;
    if (!verification.valid) {
      evaluation = await evaluateAndLog({
        caller: req.user!,
        method: 'QR',
        confidence: 1.0,
        reason: 'INVALID_SIGNATURE',
        ip: req.ip,
      });
    } else {
      evaluation = await evaluateAndLog({
        twinId: verification.twinId,
        caller: req.user!,
        method: 'QR',
        confidence: 1.0,
        ip: req.ip,
      });
    }

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTwin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { twinId } = req.params;
    const caller = req.user!;

    const twinRes = await pool.query(
      `SELECT
        t.*,
        p.sku AS product_sku, p.name AS product_name, p.brand AS product_brand,
        p.category AS product_category, p.mrp AS product_mrp, p.currency AS product_currency,
        p.material AS product_material, p.specs AS product_specs,
        b.batch_no, b.manufactured_on AS batch_manufactured_on, b.factory_location AS batch_factory_location,
        ret.organization_name AS current_retailer_org,
        own.full_name AS current_owner_name
       FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       JOIN batches b ON t.batch_id = b.id
       LEFT JOIN users ret ON t.current_retailer_id = ret.id
       LEFT JOIN users own ON t.current_owner_id = own.id
       WHERE t.id = $1`,
      [twinId],
    );

    if (!twinRes.rows.length) {
      throw notFound('Digital twin not found');
    }

    const row = twinRes.rows[0];
    const rawTwin: RawTwin = {
      id: row.id,
      twin_code: row.twin_code,
      serial_number: row.serial_number,
      product_id: row.product_id,
      batch_id: row.batch_id,
      status: row.status,
      current_retailer_id: row.current_retailer_id,
      current_owner_id: row.current_owner_id,
      claimed_at: row.claimed_at,
      original_logo_url: row.original_logo_url,
      watermarked_logo_url: row.watermarked_logo_url,
      fallback_qr_payload: row.fallback_qr_payload,
      fallback_qr_url: row.fallback_qr_url,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product: {
        id: row.product_id,
        sku: row.product_sku,
        name: row.product_name,
        brand: row.product_brand,
        category: row.product_category,
        mrp: row.product_mrp,
        currency: row.product_currency,
        material: row.product_material,
        specs: row.product_specs,
      },
      batch: {
        id: row.batch_id,
        batch_no: row.batch_no,
        manufactured_on: row.batch_manufactured_on,
        factory_location: row.batch_factory_location,
      },
      current_retailer_org: row.current_retailer_org,
      current_owner_name: row.current_owner_name,
    };

    const isOwner = rawTwin.current_owner_id === caller.id;
    const isSold = rawTwin.status === 'SOLD';
    const isManufacturer = caller.role === 'MANUFACTURER';

    if (isSold && !isOwner && !isManufacturer) {
      return void res.json({
        success: true,
        data: {
          twin: buildLimitedView(rawTwin),
          role_view: 'LIMITED',
          allowed_actions: [],
        },
      });
    }

    const eventsRes = await pool.query(
      `SELECT
        e.*,
        u.full_name AS actor_name,
        u.organization_name AS actor_org
       FROM lifecycle_events e
       LEFT JOIN users u ON e.actor_id = u.id
       WHERE e.twin_id = $1
       ORDER BY e.id ASC`,
      [rawTwin.id],
    );

    const twinView = buildTwinView(rawTwin, eventsRes.rows, caller.role, caller.id);
    const allowedActions = computeAllowedActions(rawTwin, caller.role, caller.id);

    res.json({
      success: true,
      data: {
        twin: twinView,
        role_view: 'FULL',
        allowed_actions: allowedActions,
      },
    });
  } catch (error) {
    next(error);
  }
}

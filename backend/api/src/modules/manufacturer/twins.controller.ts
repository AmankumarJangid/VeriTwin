import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import sizeOf from 'image-size';
import { pool } from '../../db/pool';
import {
  AppError,
  validationError,
  notFound,
  imageServiceUnavailable,
} from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';
import * as serial from '../../services/serial';
import * as qrSigner from '../../services/qrSigner';
import * as imageService from '../../services/imageServiceClient';
import * as storage from '../../services/storage';
import * as eventLog from '../../services/eventLog';
import { buildTwinView } from '../../services/twinView';

export const createTwinsSchema = z.object({
  product_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().int().min(1).max(25))
    .default(1),
});

export async function createTwins(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const writtenFiles: { dir: string; filename: string }[] = [];
  const client = await pool.connect();

  try {
    if (!req.file) {
      throw validationError([{ field: 'logo', message: 'Logo file is required' }]);
    }

    const parseResult = createTwinsSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const { product_id, batch_id, quantity } = parseResult.data;
    const manufacturerId = req.user!.id;

    // Validate logo dimensions (min 512x512)
    try {
      const dimensions = sizeOf(req.file.buffer);
      if (
        !dimensions.width ||
        !dimensions.height ||
        dimensions.width < 512 ||
        dimensions.height < 512
      ) {
        throw validationError([
          {
            field: 'logo',
            message: 'Logo dimensions must be at least 512x512 pixels',
          },
        ]);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw validationError([
        { field: 'logo', message: 'Invalid image format or cannot read dimensions' },
      ]);
    }

    // Verify product belongs to manufacturer
    const productRes = await client.query(
      `SELECT id, category FROM products WHERE id = $1 AND manufacturer_id = $2`,
      [product_id, manufacturerId],
    );
    if (!productRes.rows.length) {
      throw notFound('Product not found or not owned by manufacturer');
    }
    const productCategory = productRes.rows[0].category;

    // Verify batch belongs to product
    const batchRes = await client.query(
      `SELECT id FROM batches WHERE id = $1 AND product_id = $2`,
      [batch_id, product_id],
    );
    if (!batchRes.rows.length) {
      throw notFound('Batch not found or does not belong to the product');
    }

    // Save original logo once
    const originalLogoFilename = `${uuidv4()}.png`;
    storage.saveFile('originals', originalLogoFilename, req.file.buffer);
    writtenFiles.push({ dir: 'originals', filename: originalLogoFilename });
    const originalLogoUrl = storage.buildUrl('originals', originalLogoFilename);

    const year = new Date().getFullYear();
    const createdTwins: Array<{
      twin_id: string;
      serial_number: string;
      twin_code: string;
      status: string;
      watermarked_logo_url: string;
      fallback_qr_url: string;
      fallback_qr_payload: string;
      created_at: string;
    }> = [];

    await client.query('BEGIN');

    for (let i = 0; i < quantity; i++) {
      const twinId = uuidv4();
      const twinCode = serial.generateTwinCode();

      // Get next serial number sequence
      const seqRes = await client.query<{ nextval: string }>(
        `SELECT nextval('twin_serial_seq')`,
      );
      const seq = parseInt(seqRes.rows[0].nextval, 10);
      const serialNumber = serial.generateSerialNumber(productCategory, year, seq);

      // Watermark image
      let watermarkedBuffer: Buffer;
      try {
        watermarkedBuffer = await imageService.encode(req.file.buffer, twinCode);
      } catch (encodeErr) {
        throw imageServiceUnavailable(
          'Image watermarking service failed or unavailable',
        );
      }

      const assetFilename = `${twinId}.png`;
      storage.saveFile('watermarked', assetFilename, watermarkedBuffer);
      writtenFiles.push({ dir: 'watermarked', filename: assetFilename });
      const watermarkedLogoUrl = storage.buildUrl('watermarked', assetFilename);

      // Generate fallback QR
      const qrPayload = qrSigner.sign(twinId);
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 2,
        width: 512,
      });
      storage.saveFile('qr', assetFilename, qrBuffer);
      writtenFiles.push({ dir: 'qr', filename: assetFilename });
      const fallbackQrUrl = storage.buildUrl('qr', assetFilename);

      // Insert twin
      const insertRes = await client.query(
        `INSERT INTO digital_twins (
          id, twin_code, serial_number, product_id, batch_id, status,
          original_logo_url, watermarked_logo_url, fallback_qr_payload, fallback_qr_url,
          created_by
        ) VALUES ($1,$2,$3,$4,$5,'MANUFACTURED',$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          twinId,
          twinCode,
          serialNumber,
          product_id,
          batch_id,
          originalLogoUrl,
          watermarkedLogoUrl,
          qrPayload,
          fallbackQrUrl,
          manufacturerId,
        ],
      );

      const twinRow = insertRes.rows[0];

      // Append MANUFACTURED genesis lifecycle event
      await eventLog.append(client, {
        twinId,
        eventType: 'MANUFACTURED',
        actorId: manufacturerId,
        actorRole: 'MANUFACTURER',
        fromStatus: null,
        toStatus: 'MANUFACTURED',
        fromOwnerId: null,
        toOwnerId: null,
        notes: 'Twin created at factory',
        metadata: {
          batch_id,
          product_id,
          serial_number: serialNumber,
        },
      });

      createdTwins.push({
        twin_id: twinRow.id,
        serial_number: twinRow.serial_number,
        twin_code: twinRow.twin_code,
        status: twinRow.status,
        watermarked_logo_url: twinRow.watermarked_logo_url,
        fallback_qr_url: twinRow.fallback_qr_url,
        fallback_qr_payload: twinRow.fallback_qr_payload,
        created_at: new Date(twinRow.created_at).toISOString(),
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        count: createdTwins.length,
        twins: createdTwins,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // Cleanup any files written during this request
    for (const f of writtenFiles) {
      storage.deleteFile(f.dir, f.filename);
    }
    next(error);
  } finally {
    client.release();
  }
}

export async function listTwins(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, product_id, batch_id, q } = req.query;
    const manufacturerId = req.user!.id;

    const conditions: string[] = ['p.manufacturer_id = $1'];
    const values: unknown[] = [manufacturerId];
    let idx = 2;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      values.push(status);
    }
    if (product_id) {
      conditions.push(`t.product_id = $${idx++}`);
      values.push(product_id);
    }
    if (batch_id) {
      conditions.push(`t.batch_id = $${idx++}`);
      values.push(batch_id);
    }
    if (q) {
      conditions.push(`t.serial_number ILIKE $${idx++}`);
      values.push(`%${q}%`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       WHERE ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT
        t.id AS twin_id,
        t.serial_number,
        t.status,
        p.name AS product_name,
        p.sku AS product_sku,
        b.batch_no,
        ret.organization_name AS current_retailer_name,
        own.full_name AS owner_name,
        t.created_at
      FROM digital_twins t
      JOIN products p ON t.product_id = p.id
      JOIN batches b ON t.batch_id = b.id
      LEFT JOIN users ret ON t.current_retailer_id = ret.id
      LEFT JOIN users own ON t.current_owner_id = own.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);

    const formattedTwins = result.rows.map((row) => ({
      twin_id: row.twin_id,
      serial_number: row.serial_number,
      status: row.status,
      product: {
        name: row.product_name,
        sku: row.product_sku,
      },
      batch_no: row.batch_no,
      current_retailer_name: row.current_retailer_name ?? null,
      owner_name: row.owner_name ?? null,
      created_at: new Date(row.created_at).toISOString(),
    }));

    res.json({
      success: true,
      data: { twins: formattedTwins },
      meta: buildMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTwinById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { twinId } = req.params;
    const manufacturerId = req.user!.id;

    // Fetch twin + product + batch + retailer + owner
    const twinRes = await pool.query(
      `SELECT
        t.*,
        p.sku AS product_sku, p.name AS product_name, p.brand AS product_brand,
        p.category AS product_category, p.mrp AS product_mrp, p.currency AS product_currency,
        p.material AS product_material, p.specs AS product_specs, p.manufacturer_id,
        b.batch_no, b.manufactured_on AS batch_manufactured_on, b.factory_location AS batch_factory_location,
        ret.organization_name AS current_retailer_org,
        own.full_name AS current_owner_name
       FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       JOIN batches b ON t.batch_id = b.id
       LEFT JOIN users ret ON t.current_retailer_id = ret.id
       LEFT JOIN users own ON t.current_owner_id = own.id
       WHERE t.id = $1 AND p.manufacturer_id = $2`,
      [twinId, manufacturerId],
    );

    if (!twinRes.rows.length) {
      throw notFound('Digital twin not found');
    }

    const row = twinRes.rows[0];

    // Fetch lifecycle events with actor info
    const eventsRes = await pool.query(
      `SELECT
        e.*,
        u.full_name AS actor_name,
        u.organization_name AS actor_org
       FROM lifecycle_events e
       LEFT JOIN users u ON e.actor_id = u.id
       WHERE e.twin_id = $1
       ORDER BY e.id ASC`,
      [twinId],
    );

    const rawTwin = {
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

    const twinView = buildTwinView(rawTwin, eventsRes.rows, req.user!.role, req.user!.id);

    res.json({
      success: true,
      data: {
        twin: twinView,
        assets: {
          watermarked_logo_url: row.watermarked_logo_url,
          fallback_qr_url: row.fallback_qr_url,
          fallback_qr_payload: row.fallback_qr_payload,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

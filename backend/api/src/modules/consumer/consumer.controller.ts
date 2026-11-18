import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../db/pool';
import { env } from '../../config/env';
import {
  validationError,
  notFound,
  notOwner,
  cannotClaimOwn,
  transferInvalid,
  transferAlreadyUsed,
  transferExpired,
  invalidQrFormat,
} from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';
import { sha256hex } from '../../utils/hash';
import * as stateMachine from '../../services/twinStateMachine';
import { buildTwinView, buildTimelineEvent, RawTwin } from '../../services/twinView';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const createTransferSchema = z.object({
  twin_id: z.string().uuid(),
});

export const claimTransferSchema = z.object({
  qr_payload: z.string().min(1),
});

// ─── GET /api/consumer/vault ─────────────────────────────────────────────────

export async function getVault(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const consumerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query);

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM digital_twins WHERE current_owner_id = $1 AND status = 'SOLD'`,
      [consumerId],
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT
        t.id AS twin_id,
        t.serial_number,
        p.name AS product_name,
        p.brand AS product_brand,
        p.mrp AS product_mrp,
        e.event_type AS acquired_via,
        e.created_at AS acquired_at,
        EXISTS (
          SELECT 1 FROM transfer_tokens
          WHERE twin_id = t.id AND status = 'PENDING' AND expires_at > now()
        ) AS has_active_transfer
      FROM digital_twins t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT event_type, created_at
        FROM lifecycle_events
        WHERE twin_id = t.id AND to_owner_id = $1 AND event_type IN ('FIRST_SALE', 'RESOLD')
        ORDER BY id DESC
        LIMIT 1
      ) e ON true
      WHERE t.current_owner_id = $1 AND t.status = 'SOLD'
      ORDER BY t.updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [consumerId, limit, offset]);

    const formattedItems = result.rows.map((r) => ({
      twin_id: r.twin_id,
      serial_number: r.serial_number,
      product: {
        name: r.product_name,
        brand: r.product_brand,
        mrp: Number(r.product_mrp),
      },
      acquired_at: r.acquired_at ? new Date(r.acquired_at).toISOString() : new Date().toISOString(),
      acquired_via: r.acquired_via ?? 'FIRST_SALE',
      has_active_transfer: Boolean(r.has_active_transfer),
    }));

    res.json({
      success: true,
      data: { items: formattedItems },
      meta: buildMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/consumer/vault/:twinId ─────────────────────────────────────────

export async function getVaultTwin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { twinId } = req.params;
    const consumerId = req.user!.id;

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

    // Must be owner!
    if (row.current_owner_id !== consumerId) {
      throw notOwner();
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
      [twinId],
    );

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

    const twinView = buildTwinView(rawTwin, eventsRes.rows, req.user!.role, consumerId);

    res.json({
      success: true,
      data: {
        twin: twinView,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/consumer/transfers ─────────────────────────────────────────────

export async function createTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const parseRes = createTransferSchema.safeParse(req.body);
    if (!parseRes.success) {
      throw validationError(
        parseRes.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const { twin_id } = parseRes.data;
    const sellerId = req.user!.id;

    // Check ownership
    const twinRes = await client.query(
      `SELECT id, current_owner_id, status FROM digital_twins WHERE id = $1`,
      [twin_id],
    );
    if (!twinRes.rows.length) {
      throw notFound('Digital twin not found');
    }
    const twin = twinRes.rows[0];

    if (twin.current_owner_id !== sellerId || twin.status !== 'SOLD') {
      throw notOwner();
    }

    await client.query('BEGIN');

    // Cancel any existing pending transfers for this twin
    await client.query(
      `UPDATE transfer_tokens SET status = 'CANCELLED' WHERE twin_id = $1 AND status = 'PENDING'`,
      [twin_id],
    );

    // Generate 32 random bytes -> base64url string
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256hex(rawToken);
    const ttlSeconds = env.TRANSFER_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const transferId = uuidv4();

    await client.query(
      `INSERT INTO transfer_tokens (id, twin_id, seller_id, token_hash, status, expires_at)
       VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
      [transferId, twin_id, sellerId, tokenHash, expiresAt.toISOString()],
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        transfer_id: transferId,
        twin_id,
        qr_payload: `VTX1.${rawToken}`,
        status: 'PENDING',
        ttl_seconds: ttlSeconds,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ─── GET /api/consumer/transfers/:transferId ──────────────────────────────────

export async function getTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { transferId } = req.params;

    const result = await pool.query(
      `SELECT id, twin_id, status, expires_at, claimed_at FROM transfer_tokens WHERE id = $1`,
      [transferId],
    );

    if (!result.rows.length) {
      throw notFound('Transfer not found');
    }

    const row = result.rows[0];
    let status = row.status;

    // Lazily flip PENDING to EXPIRED if past expiry
    if (status === 'PENDING' && new Date(row.expires_at) < new Date()) {
      status = 'EXPIRED';
      await pool.query(
        `UPDATE transfer_tokens SET status = 'EXPIRED' WHERE id = $1 AND status = 'PENDING'`,
        [transferId],
      );
    }

    res.json({
      success: true,
      data: {
        transfer_id: row.id,
        status,
        expires_at: new Date(row.expires_at).toISOString(),
        claimed_at: row.claimed_at ? new Date(row.claimed_at).toISOString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/consumer/transfers/:transferId ───────────────────────────────

export async function cancelTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { transferId } = req.params;
    const sellerId = req.user!.id;

    const result = await pool.query(
      `SELECT id, seller_id, status FROM transfer_tokens WHERE id = $1`,
      [transferId],
    );

    if (!result.rows.length) {
      throw notFound('Transfer not found');
    }

    const row = result.rows[0];
    if (row.seller_id !== sellerId) {
      throw notOwner();
    }

    if (row.status === 'PENDING') {
      await pool.query(
        `UPDATE transfer_tokens SET status = 'CANCELLED' WHERE id = $1`,
        [transferId],
      );
    }

    res.json({
      success: true,
      data: {
        transfer_id: transferId,
        status: 'CANCELLED',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/consumer/transfers/claim ───────────────────────────────────────

export async function claimTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const parseRes = claimTransferSchema.safeParse(req.body);
    if (!parseRes.success) {
      throw validationError(
        parseRes.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const { qr_payload } = parseRes.data;
    const buyerId = req.user!.id;

    if (!qr_payload.startsWith('VTX1.')) {
      throw invalidQrFormat({ hint: 'Expected VTX1. transfer QR code' });
    }

    const rawToken = qr_payload.slice(5);
    const tokenHash = sha256hex(rawToken);

    await client.query('BEGIN');

    // SELECT token FOR UPDATE
    const tokenRes = await client.query(
      `SELECT * FROM transfer_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );

    if (!tokenRes.rows.length) {
      throw transferInvalid();
    }

    const token = tokenRes.rows[0];

    // Check seller != buyer
    if (token.seller_id === buyerId) {
      throw cannotClaimOwn();
    }

    // Check status
    if (token.status === 'CLAIMED' || token.status === 'CANCELLED') {
      throw transferAlreadyUsed();
    }

    if (token.status === 'EXPIRED' || new Date(token.expires_at) < new Date()) {
      await client.query(
        `UPDATE transfer_tokens SET status = 'EXPIRED' WHERE id = $1`,
        [token.id],
      );
      await client.query('COMMIT');
      throw transferExpired();
    }

    const transferredAt = new Date().toISOString();

    // Perform RESOLD state transition
    const createdEventRow = await stateMachine.applyEvent(
      client,
      token.twin_id,
      'RESOLD',
      { id: buyerId, role: 'CONSUMER' },
      {
        toOwnerId: buyerId,
        notes: 'P2P Transfer Handshake',
        metadata: {
          from_owner_id: token.seller_id,
          to_owner_id: buyerId,
          transfer_id: token.id,
        },
      },
    );

    // Update token
    await client.query(
      `UPDATE transfer_tokens
       SET status = 'CLAIMED', buyer_id = $1, claimed_at = $2
       WHERE id = $3`,
      [buyerId, transferredAt, token.id],
    );

    // Fetch actor info
    const buyerRes = await client.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [buyerId],
    );
    const buyerName = buyerRes.rows[0]?.full_name;

    await client.query('COMMIT');

    // Fetch updated twin view
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
      [token.twin_id],
    );

    const row = twinRes.rows[0];

    const eventsRes = await pool.query(
      `SELECT
        e.*,
        u.full_name AS actor_name,
        u.organization_name AS actor_org
       FROM lifecycle_events e
       LEFT JOIN users u ON e.actor_id = u.id
       WHERE e.twin_id = $1
       ORDER BY e.id ASC`,
      [token.twin_id],
    );

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

    const twinView = buildTwinView(rawTwin, eventsRes.rows, req.user!.role, buyerId);

    const rawEvent = {
      ...createdEventRow,
      actor_name: buyerName,
      actor_role: 'CONSUMER',
    };
    const timelineEvent = buildTimelineEvent(rawEvent, req.user!.role);

    res.json({
      success: true,
      data: {
        twin: twinView,
        transferred_at: transferredAt,
        event: timelineEvent,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

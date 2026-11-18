import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import {
  validationError,
  notFound,
  notAssigned,
  invalidStateTransition,
} from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';
import * as stateMachine from '../../services/twinStateMachine';
import { buildTimelineEvent } from '../../services/twinView';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const retailerEventSchema = z.object({
  event_type: z.enum(['RECEIVED_AT_RETAIL', 'INSPECTED']),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const sellSchema = z.object({
  consumer_id: z.string().uuid(),
  sale_price: z.number().nonnegative(),
  invoice_no: z.string().min(1),
  notes: z.string().optional(),
});

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const maskedLocal = local.length > 0 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

// ─── GET /api/retailer/inventory ─────────────────────────────────────────────

export async function getInventory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const retailerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query);
    const { status, q } = req.query;

    const conditions: string[] = ['t.current_retailer_id = $1'];
    const values: unknown[] = [retailerId];
    let idx = 2;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      values.push(status);
    } else {
      conditions.push(`t.status IN ('IN_TRANSIT', 'IN_RETAIL')`);
    }

    if (q) {
      conditions.push(`(t.serial_number ILIKE $${idx} OR p.name ILIKE $${idx})`);
      values.push(`%${q}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Counts for IN_TRANSIT and IN_RETAIL
    const countsRes = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'IN_TRANSIT') AS in_transit,
        COUNT(*) FILTER (WHERE status = 'IN_RETAIL') AS in_retail
       FROM digital_twins
       WHERE current_retailer_id = $1`,
      [retailerId],
    );

    const counts = {
      IN_TRANSIT: parseInt(countsRes.rows[0].in_transit, 10),
      IN_RETAIL: parseInt(countsRes.rows[0].in_retail, 10),
    };

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
        p.mrp AS product_mrp,
        (SELECT created_at FROM lifecycle_events WHERE twin_id = t.id AND event_type = 'DISPATCHED_TO_RETAIL' ORDER BY id DESC LIMIT 1) AS dispatched_at,
        (SELECT created_at FROM lifecycle_events WHERE twin_id = t.id AND event_type = 'RECEIVED_AT_RETAIL' ORDER BY id DESC LIMIT 1) AS received_at
      FROM digital_twins t
      JOIN products p ON t.product_id = p.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);

    const formattedTwins = result.rows.map((r) => ({
      twin_id: r.twin_id,
      serial_number: r.serial_number,
      status: r.status,
      product: {
        name: r.product_name,
        sku: r.product_sku,
        mrp: Number(r.product_mrp),
      },
      dispatched_at: r.dispatched_at ? new Date(r.dispatched_at).toISOString() : null,
      received_at: r.received_at ? new Date(r.received_at).toISOString() : null,
    }));

    res.json({
      success: true,
      data: {
        twins: formattedTwins,
        counts,
      },
      meta: buildMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/retailer/twins/:twinId/events ──────────────────────────────────

export async function createRetailerEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const { twinId } = req.params;
    const { event_type, notes, metadata = {} } =
      req.body as z.infer<typeof retailerEventSchema>;
    const retailerId = req.user!.id;

    // Verify twin assigned to retailer
    const twinRes = await client.query(
      `SELECT id, status, current_retailer_id FROM digital_twins WHERE id = $1`,
      [twinId],
    );
    if (!twinRes.rows.length) {
      throw notFound('Digital twin not found');
    }
    const twin = twinRes.rows[0];

    if (twin.current_retailer_id !== retailerId) {
      throw notAssigned();
    }

    await client.query('BEGIN');

    const createdEventRow = await stateMachine.applyEvent(
      client,
      twinId,
      event_type,
      { id: retailerId, role: 'RETAILER' },
      { notes: notes ?? null, metadata },
    );

    // Fetch actor info
    const actorRes = await client.query(
      `SELECT organization_name, full_name FROM users WHERE id = $1`,
      [retailerId],
    );
    const actor = actorRes.rows[0];

    await client.query('COMMIT');

    const rawEvent = {
      ...createdEventRow,
      actor_org: actor?.organization_name,
      actor_name: actor?.full_name,
    };

    const timelineEvent = buildTimelineEvent(rawEvent, req.user!.role);

    res.status(201).json({
      success: true,
      data: {
        event: timelineEvent,
        twin_status: 'IN_RETAIL',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ─── GET /api/retailer/consumers/lookup ───────────────────────────────────────

export async function lookupConsumer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = req.query.email as string;
    if (!email) {
      throw validationError([{ field: 'email', message: 'Email query parameter is required' }]);
    }

    const result = await pool.query(
      `SELECT id AS user_id, full_name, email FROM users WHERE lower(email) = lower($1) AND role = 'CONSUMER'`,
      [email],
    );

    if (!result.rows.length) {
      throw notFound('Consumer not found');
    }

    const consumer = result.rows[0];

    res.json({
      success: true,
      data: {
        consumer: {
          user_id: consumer.user_id,
          full_name: consumer.full_name,
          email_masked: maskEmail(consumer.email),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/retailer/twins/:twinId/sell ────────────────────────────────────

export async function sellTwin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const { twinId } = req.params;
    const parseRes = sellSchema.safeParse(req.body);
    if (!parseRes.success) {
      throw validationError(
        parseRes.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const { consumer_id, sale_price, invoice_no, notes } = parseRes.data;
    const retailerId = req.user!.id;

    // Check consumer exists and has role CONSUMER
    const consumerRes = await client.query(
      `SELECT id, full_name FROM users WHERE id = $1 AND role = 'CONSUMER'`,
      [consumer_id],
    );
    if (!consumerRes.rows.length) {
      throw notFound('Consumer not found or does not have CONSUMER role');
    }
    const consumer = consumerRes.rows[0];

    await client.query('BEGIN');

    // Lock twin row
    const twinRes = await client.query(
      `SELECT id, status, current_retailer_id FROM digital_twins WHERE id = $1 FOR UPDATE`,
      [twinId],
    );
    if (!twinRes.rows.length) {
      throw notFound('Digital twin not found');
    }
    const twin = twinRes.rows[0];

    if (twin.current_retailer_id !== retailerId) {
      throw notAssigned();
    }

    if (twin.status !== 'IN_RETAIL') {
      throw invalidStateTransition(twin.status, ['IN_RETAIL']);
    }

    const createdEventRow = await stateMachine.applyEvent(
      client,
      twinId,
      'FIRST_SALE',
      { id: retailerId, role: 'RETAILER' },
      {
        toOwnerId: consumer_id,
        notes: notes ?? null,
        metadata: {
          invoice_no,
          sale_price,
        },
      },
    );

    // Fetch actor info
    const actorRes = await client.query(
      `SELECT organization_name, full_name FROM users WHERE id = $1`,
      [retailerId],
    );
    const actor = actorRes.rows[0];

    await client.query('COMMIT');

    const rawEvent = {
      ...createdEventRow,
      actor_org: actor?.organization_name,
      actor_name: actor?.full_name,
    };

    const timelineEvent = buildTimelineEvent(rawEvent, req.user!.role);

    res.json({
      success: true,
      data: {
        twin_id: twinId,
        status: 'SOLD',
        owner: {
          user_id: consumer.id,
          full_name: consumer.full_name,
        },
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

// ─── GET /api/retailer/sales ──────────────────────────────────────────────────

export async function getSales(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const retailerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query);

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM lifecycle_events WHERE event_type = 'FIRST_SALE' AND actor_id = $1`,
      [retailerId],
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT
        t.id AS twin_id,
        t.serial_number,
        p.name AS product_name,
        u.full_name AS consumer_name,
        (e.metadata->>'sale_price')::numeric AS sale_price,
        e.metadata->>'invoice_no' AS invoice_no,
        e.created_at AS sold_at
      FROM lifecycle_events e
      JOIN digital_twins t ON e.twin_id = t.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON e.to_owner_id = u.id
      WHERE e.event_type = 'FIRST_SALE' AND e.actor_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [retailerId, limit, offset]);

    const formattedSales = result.rows.map((r) => ({
      twin_id: r.twin_id,
      serial_number: r.serial_number,
      product_name: r.product_name,
      consumer_name: r.consumer_name ?? 'Consumer',
      sale_price: Number(r.sale_price ?? 0),
      invoice_no: r.invoice_no ?? '',
      sold_at: new Date(r.sold_at).toISOString(),
    }));

    res.json({
      success: true,
      data: { sales: formattedSales },
      meta: buildMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

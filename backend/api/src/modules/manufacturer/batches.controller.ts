import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { conflict, notFound } from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const createBatchSchema = z.object({
  product_id: z.string().uuid(),
  batch_no: z.string().min(1).max(64),
  planned_quantity: z.number().int().positive(),
  manufactured_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date string YYYY-MM-DD'),
  factory_location: z.string().max(160).optional(),
  notes: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapBatch(row: Record<string, unknown>) {
  return {
    batch_id: row.id,
    batch_no: row.batch_no,
    product_id: row.product_id,
    planned_quantity: row.planned_quantity,
    manufactured_on: row.manufactured_on,
    factory_location: row.factory_location,
    notes: row.notes,
    created_at: row.created_at,
  };
}

// ─── POST /api/manufacturer/batches ──────────────────────────────────────────

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { product_id, batch_no, planned_quantity, manufactured_on, factory_location, notes } =
      req.body as z.infer<typeof createBatchSchema>;

    // Verify product belongs to this manufacturer
    const productResult = await pool.query(
      `SELECT id FROM products WHERE id = $1 AND manufacturer_id = $2`,
      [product_id, manufacturerId],
    );

    if (!productResult.rows.length) {
      return next(notFound('Product not found or does not belong to you'));
    }

    const result = await pool.query(
      `INSERT INTO batches (product_id, batch_no, planned_quantity, manufactured_on, factory_location, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [product_id, batch_no, planned_quantity, manufactured_on, factory_location ?? null, notes ?? null],
    );

    res.status(201).json({ success: true, data: { batch: mapBatch(result.rows[0]) } });
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === '23505') {
      return next(conflict('A batch with this batch_no already exists'));
    }
    next(err);
  }
}

// ─── GET /api/manufacturer/batches ───────────────────────────────────────────

export async function listBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const productId = req.query.product_id as string | undefined;

    // If product_id filter is provided, verify it belongs to this manufacturer
    if (productId) {
      const productResult = await pool.query(
        `SELECT id FROM products WHERE id = $1 AND manufacturer_id = $2`,
        [productId, manufacturerId],
      );
      if (!productResult.rows.length) {
        return next(notFound('Product not found or does not belong to you'));
      }
    }

    const conditions: string[] = ['p.manufacturer_id = $1'];
    const params: unknown[] = [manufacturerId];
    let idx = 2;

    if (productId) {
      conditions.push(`b.product_id = $${idx}`);
      params.push(productId);
      idx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM batches b
       JOIN products p ON p.id = b.product_id
       WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT b.*, COUNT(dt.id) AS twins_count
       FROM batches b
       JOIN products p ON p.id = b.product_id
       LEFT JOIN digital_twins dt ON dt.batch_id = b.id
       WHERE ${where}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    const batches = dataResult.rows.map((row) => ({
      ...mapBatch(row),
      twins_count: parseInt(String(row.twins_count), 10),
    }));

    res.json({
      success: true,
      data: { batches },
      meta: buildMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
}

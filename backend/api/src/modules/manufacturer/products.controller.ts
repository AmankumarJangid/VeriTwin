import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { AppError, conflict, notFound } from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  brand: z.string().min(1).max(120),
  category: z.enum(['WATCH', 'APPAREL', 'FOOTWEAR', 'ACCESSORY', 'OTHER']),
  mrp: z.number().nonnegative(),
  currency: z.string().length(3).default('INR'),
  material: z.string().max(255).optional(),
  specs: z.record(z.unknown()).optional(),
  description: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  mrp: z.number().nonnegative().optional(),
  material: z.string().max(255).optional(),
  specs: z.record(z.unknown()).optional(),
  description: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapProduct(row: Record<string, unknown>) {
  return {
    product_id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    mrp: row.mrp,
    currency: row.currency,
    material: row.material,
    specs: row.specs,
    description: row.description,
    created_at: row.created_at,
  };
}

// ─── POST /api/manufacturer/products ─────────────────────────────────────────

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sku, name, brand, category, mrp, currency, material, specs, description } =
      req.body as z.infer<typeof createProductSchema>;
    const manufacturerId = req.user!.id;

    const result = await pool.query(
      `INSERT INTO products (manufacturer_id, sku, name, brand, category, mrp, currency, material, specs, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        manufacturerId,
        sku,
        name,
        brand,
        category,
        mrp,
        currency,
        material ?? null,
        JSON.stringify(specs ?? {}),
        description ?? null,
      ],
    );

    res.status(201).json({ success: true, data: { product: mapProduct(result.rows[0]) } });
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === '23505') {
      return next(conflict('A product with this SKU already exists'));
    }
    next(err);
  }
}

// ─── GET /api/manufacturer/products ──────────────────────────────────────────

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;

    const conditions: string[] = ['manufacturer_id = $1'];
    const params: unknown[] = [manufacturerId];
    let idx = 2;

    if (q) {
      conditions.push(`(name ILIKE $${idx} OR sku ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }
    if (category) {
      conditions.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT * FROM products WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: { products: dataResult.rows.map(mapProduct) },
      meta: buildMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/manufacturer/products/:productId ────────────────────────────────

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { productId } = req.params;

    const productResult = await pool.query(
      `SELECT * FROM products WHERE id = $1 AND manufacturer_id = $2`,
      [productId, manufacturerId],
    );

    if (!productResult.rows.length) {
      return next(notFound('Product not found'));
    }

    const product = productResult.rows[0];

    const statsResult = await pool.query<{
      twins_total: string;
      sold: string;
      in_retail: string;
    }>(
      `SELECT
         COUNT(*) AS twins_total,
         COUNT(*) FILTER (WHERE status = 'SOLD') AS sold,
         COUNT(*) FILTER (WHERE status = 'IN_RETAIL') AS in_retail
       FROM digital_twins
       WHERE product_id = $1`,
      [productId],
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        product: mapProduct(product),
        stats: {
          twins_total: parseInt(stats.twins_total, 10),
          sold: parseInt(stats.sold, 10),
          in_retail: parseInt(stats.in_retail, 10),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/manufacturer/products/:productId ──────────────────────────────

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { productId } = req.params;
    const updates = req.body as z.infer<typeof updateProductSchema>;

    // Fetch current product
    const productResult = await pool.query(
      `SELECT * FROM products WHERE id = $1 AND manufacturer_id = $2`,
      [productId, manufacturerId],
    );

    if (!productResult.rows.length) {
      return next(notFound('Product not found'));
    }

    const before = productResult.rows[0];

    const setFields: string[] = ['updated_at = now()'];
    const setValues: unknown[] = [productId, manufacturerId];
    let idx = 3;

    if (updates.name !== undefined) {
      setFields.push(`name = $${idx++}`);
      setValues.push(updates.name);
    }
    if (updates.mrp !== undefined) {
      setFields.push(`mrp = $${idx++}`);
      setValues.push(updates.mrp);
    }
    if (updates.material !== undefined) {
      setFields.push(`material = $${idx++}`);
      setValues.push(updates.material);
    }
    if (updates.specs !== undefined) {
      setFields.push(`specs = $${idx++}`);
      setValues.push(JSON.stringify(updates.specs));
    }
    if (updates.description !== undefined) {
      setFields.push(`description = $${idx++}`);
      setValues.push(updates.description);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const afterResult = await client.query(
        `UPDATE products SET ${setFields.join(', ')} WHERE id = $1 AND manufacturer_id = $2 RETURNING *`,
        setValues,
      );

      const after = afterResult.rows[0];

      await client.query(
        `INSERT INTO product_audit (product_id, changed_by, before, after) VALUES ($1,$2,$3,$4)`,
        [productId, manufacturerId, JSON.stringify(before), JSON.stringify(after)],
      );

      await client.query('COMMIT');
      res.json({ success: true, data: { product: mapProduct(after) } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

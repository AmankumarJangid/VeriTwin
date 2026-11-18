import bcrypt from 'bcrypt';
import { pool } from './pool';

interface SeedUser {
  full_name: string;
  email: string;
  password: string;
  role: 'MANUFACTURER' | 'RETAILER' | 'CONSUMER';
  organization_name?: string;
}

const SEED_USERS: SeedUser[] = [
  {
    full_name: 'Aurelia Maker',
    email: 'maker@veritwin.dev',
    password: 'Maker@123',
    role: 'MANUFACTURER',
    organization_name: 'Aurelia Watches',
  },
  {
    full_name: 'TimeHouse Retail',
    email: 'retail@veritwin.dev',
    password: 'Retail@123',
    role: 'RETAILER',
    organization_name: 'TimeHouse Retail',
  },
  {
    full_name: 'Riya Sharma',
    email: 'riya@veritwin.dev',
    password: 'Riya@123',
    role: 'CONSUMER',
  },
  {
    full_name: 'Arjun Verma',
    email: 'arjun@veritwin.dev',
    password: 'Arjun@123',
    role: 'CONSUMER',
  },
];

export async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    // Upsert / update seed users with correct passwords from 00_SHARED_CONTRACT.md §8
    for (const u of SEED_USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const existing = await client.query('SELECT id FROM users WHERE lower(email) = $1', [u.email.toLowerCase()]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO users (full_name, email, password_hash, role, organization_name)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.full_name, u.email, hash, u.role, u.organization_name ?? null],
        );
      } else {
        // Ensure password and name match contract
        await client.query(
          `UPDATE users SET password_hash = $1, full_name = $2 WHERE id = $3`,
          [hash, u.full_name, existing.rows[0].id],
        );
      }
    }

    // Insert product if missing
    const mfrRes = await client.query('SELECT id FROM users WHERE email = $1', ['maker@veritwin.dev']);
    const mfrId = mfrRes.rows[0].id;

    const prodCheck = await client.query('SELECT id FROM products WHERE sku = $1', ['WCH-CHR-001']);
    let productId: string;
    if (prodCheck.rows.length === 0) {
      const productResult = await client.query<{ id: string }>(
        `INSERT INTO products (manufacturer_id, sku, name, brand, category, mrp, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [mfrId, 'WCH-CHR-001', 'Chrono Classic 42', 'Aurelia', 'WATCH', 24999, 'INR'],
      );
      productId = productResult.rows[0].id;
    } else {
      productId = prodCheck.rows[0].id;
    }

    // Insert batch if missing
    const batchCheck = await client.query('SELECT id FROM batches WHERE batch_no = $1', ['B-2026-11-A']);
    if (batchCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO batches (product_id, batch_no, planned_quantity, manufactured_on, factory_location)
         VALUES ($1, $2, $3, $4, $5)`,
        [productId, 'B-2026-11-A', 100, '2026-11-10', 'Jodhpur, IN'],
      );
    }

    console.log('✅ Seed data inserted successfully.');
  } finally {
    client.release();
  }
}

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    // Check if already migrated by seeing if 'users' table exists
    const check = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'users'
      ) AS "exists"`,
    );

    if (check.rows[0].exists) {
      console.log('✅ Database already migrated, skipping.');
      return;
    }

    const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Migration 001_init.sql applied.');
  } finally {
    client.release();
  }
}

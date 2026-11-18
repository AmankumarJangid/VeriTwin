import crypto from 'crypto';
import { pool } from '../db/pool';
import { env } from '../config/env';

export interface TransferToken {
  id: string;
  twin_id: string;
  seller_id: string;
  buyer_id: string | null;
  token_hash: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  expires_at: Date;
  claimed_at: Date | null;
  created_at: Date;
}

export async function createTransferToken(twinId: string, sellerId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + env.TRANSFER_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO transfer_tokens (twin_id, seller_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [twinId, sellerId, tokenHash, expiresAt.toISOString()],
  );

  return rawToken;
}

export async function findPendingToken(rawToken: string): Promise<TransferToken | null> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const result = await pool.query<TransferToken>(
    `SELECT * FROM transfer_tokens WHERE token_hash = $1 AND status = 'PENDING'`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function claimTransferToken(
  tokenId: string,
  buyerId: string,
): Promise<void> {
  await pool.query(
    `UPDATE transfer_tokens
     SET status = 'CLAIMED', buyer_id = $2, claimed_at = now()
     WHERE id = $1`,
    [tokenId, buyerId],
  );
}

export async function expireStaleTokens(): Promise<void> {
  await pool.query(
    `UPDATE transfer_tokens
     SET status = 'EXPIRED'
     WHERE status = 'PENDING' AND expires_at < now()`,
  );
}

export async function cancelTransferToken(twinId: string, sellerId: string): Promise<void> {
  await pool.query(
    `UPDATE transfer_tokens
     SET status = 'CANCELLED'
     WHERE twin_id = $1 AND seller_id = $2 AND status = 'PENDING'`,
    [twinId, sellerId],
  );
}

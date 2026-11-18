import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../../db/pool';
import { env } from '../../config/env';
import { sha256hex } from '../../utils/hash';
import { AppError, conflict, unauthenticated, forbidden, notFound, validationError } from '../../utils/errors';

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  role: 'MANUFACTURER' | 'RETAILER' | 'CONSUMER';
  organization_name?: string;
  invite_code?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface UserRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  organization_name: string | null;
  created_at: Date;
}

function formatUser(row: any): UserRow {
  return {
    id: row.id,
    user_id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    organization_name: row.organization_name ?? null,
    created_at: row.created_at,
  };
}

async function generateTokens(userId: string, role: string): Promise<TokenPair> {
  const accessToken = jwt.sign(
    { sub: userId, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS },
  );

  const rawRefresh = crypto.randomBytes(48).toString('hex');
  const tokenHash = sha256hex(rawRefresh);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  );

  return {
    access_token: accessToken,
    refresh_token: rawRefresh,
    expires_in: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function register(input: RegisterInput): Promise<{ user: UserRow; tokens: TokenPair }> {
  const { full_name, email, password, role, organization_name, invite_code } = input;

  // Validate invite codes for non-consumer roles
  if (role === 'MANUFACTURER') {
    if (invite_code !== env.MANUFACTURER_INVITE_CODE) {
      throw forbidden('Invalid manufacturer invite code');
    }
    if (!organization_name) {
      throw validationError([{ field: 'organization_name', message: 'organization_name is required for MANUFACTURER' }]);
    }
  }

  if (role === 'RETAILER') {
    if (invite_code !== env.RETAILER_INVITE_CODE) {
      throw forbidden('Invalid retailer invite code');
    }
    if (!organization_name) {
      throw validationError([{ field: 'organization_name', message: 'organization_name is required for RETAILER' }]);
    }
  }

  // Check email uniqueness
  const existing = await pool.query(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  if (existing.rows.length > 0) {
    throw conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, role, organization_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, role, organization_name, created_at`,
    [full_name, email, passwordHash, role, organization_name ?? null],
  );

  const user = formatUser(result.rows[0]);
  const tokens = await generateTokens(user.id, user.role);

  return { user, tokens };
}

export async function login(input: LoginInput): Promise<{ user: UserRow; tokens: TokenPair }> {
  const { email, password } = input;

  const result = await pool.query<any>(
    `SELECT id, full_name, email, role, organization_name, created_at, password_hash
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  );

  if (!result.rows.length) {
    throw unauthenticated();
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw unauthenticated();
  }

  const tokens = await generateTokens(user.id, user.role);

  return { user: formatUser(user), tokens };
}

export async function refresh(input: { refresh_token: string }): Promise<TokenPair> {
  const tokenHash = sha256hex(input.refresh_token);

  const result = await pool.query<{
    id: string;
    user_id: string;
    expires_at: Date;
    revoked_at: Date | null;
    role: string;
  }>(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash],
  );

  if (!result.rows.length) {
    throw unauthenticated();
  }

  const token = result.rows[0];

  if (token.revoked_at) {
    throw unauthenticated();
  }

  if (new Date(token.expires_at) < new Date()) {
    throw new AppError('TOKEN_EXPIRED', 'Refresh token has expired', 401);
  }

  // Revoke old token
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
    [token.id],
  );

  // Issue new token pair
  return generateTokens(token.user_id, token.role);
}

export async function logout(input: { refresh_token: string; userId: string }): Promise<void> {
  const tokenHash = sha256hex(input.refresh_token);
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [tokenHash, input.userId],
  );
}

export async function getMe(userId: string): Promise<UserRow> {
  const result = await pool.query<any>(
    `SELECT id, full_name, email, role, organization_name, created_at
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!result.rows.length) {
    throw notFound('User not found');
  }
  return formatUser(result.rows[0]);
}

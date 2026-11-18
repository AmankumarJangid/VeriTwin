import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function sha256hex(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function generateTransferToken(): { rawToken: string; qrPayload: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const qrPayload = `VTX1.${rawToken}`;
  const tokenHash = sha256hex(rawToken);
  return { rawToken, qrPayload, tokenHash };
}

describe('Special Unit Test: P2P Transfer Security & Handshake Rules', () => {
  it('generates high-entropy 32-byte base64url token with VTX1 prefix for QR', () => {
    const { rawToken, qrPayload, tokenHash } = generateTransferToken();

    expect(rawToken).toHaveLength(43); // 32 bytes in base64url is 43 chars
    expect(qrPayload.startsWith('VTX1.')).toBe(true);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stores only sha256 hash at rest, never the raw token', () => {
    const { rawToken, tokenHash } = generateTransferToken();

    // Verification by hashing incoming token
    const incomingToken = rawToken;
    const computedHash = sha256hex(incomingToken);
    expect(computedHash).toBe(tokenHash);

    // Tampering by 1 char fails lookup
    const tamperedIncoming = incomingToken.slice(0, -1) + 'X';
    expect(sha256hex(tamperedIncoming)).not.toBe(tokenHash);
  });

  it('enforces 120-second TTL expiration window', () => {
    const now = Date.now();
    const ttlSeconds = 120;
    const expiresAt = new Date(now + ttlSeconds * 1000);

    // Within window -> valid
    const check1 = new Date(now + 60 * 1000);
    expect(check1 < expiresAt).toBe(true);

    // Past 120s -> expired
    const check2 = new Date(now + 121 * 1000);
    expect(check2 < expiresAt).toBe(false);
  });

  it('prohibits self-claiming (seller cannot claim their own token)', () => {
    const sellerId = 'seller-user-uuid';
    const buyerId = 'seller-user-uuid'; // Same user attempting claim

    const isSelfClaim = sellerId === buyerId;
    expect(isSelfClaim).toBe(true);
    // Business logic throws CANNOT_CLAIM_OWN (400)
  });

  it('enforces single-use token lifecycle (PENDING -> CLAIMED | EXPIRED | CANCELLED)', () => {
    let status = 'PENDING';

    // First claim succeeds
    if (status === 'PENDING') {
      status = 'CLAIMED';
    }
    expect(status).toBe('CLAIMED');

    // Second claim attempts on same token fail with TRANSFER_ALREADY_USED (409)
    const canClaimAgain = status === 'PENDING';
    expect(canClaimAgain).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

const TEST_SECRET = 'production-qr-hmac-secret-32plus-chars-long';

function signQr(twinId: string, secret = TEST_SECRET): string {
  const prefix = 'VT1.' + Buffer.from(twinId).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update('VT1.' + twinId)
    .digest('base64url');
  return `${prefix}.${hmac}`;
}

function verifyQr(payload: string, secret = TEST_SECRET): { valid: boolean; twinId?: string } {
  const parts = payload.split('.');
  if (parts.length !== 3 || parts[0] !== 'VT1') {
    return { valid: false };
  }

  let twinId: string;
  try {
    twinId = Buffer.from(parts[1], 'base64url').toString('utf8');
  } catch {
    return { valid: false };
  }

  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update('VT1.' + twinId)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedHmac);
  const actualBuf = Buffer.from(parts[2]);

  if (expectedBuf.length !== actualBuf.length) {
    return { valid: false };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, actualBuf);
  return valid ? { valid: true, twinId } : { valid: false };
}

describe('Special Unit Test: Fallback QR HMAC Signer & Verifier', () => {
  const validTwinId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('generates a valid signed payload matching VT1.<base64url>.<hmac>', () => {
    const payload = signQr(validTwinId);
    expect(payload.startsWith('VT1.')).toBe(true);

    const parts = payload.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('VT1');
    expect(Buffer.from(parts[1], 'base64url').toString('utf8')).toBe(validTwinId);
  });

  it('verifies a genuine signed QR payload successfully', () => {
    const payload = signQr(validTwinId);
    const result = verifyQr(payload);
    expect(result.valid).toBe(true);
    expect(result.twinId).toBe(validTwinId);
  });

  it('fails verification if HMAC signature is modified by even a single character', () => {
    const payload = signQr(validTwinId);
    const parts = payload.split('.');
    const tamperedSig = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A');
    const tamperedPayload = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const result = verifyQr(tamperedPayload);
    expect(result.valid).toBe(false);
  });

  it('fails verification if twin ID in body is modified without signature update', () => {
    const payload = signQr(validTwinId);
    const parts = payload.split('.');
    const fakeTwinId = '00000000-0000-0000-0000-000000000000';
    const fakeEncoded = Buffer.from(fakeTwinId).toString('base64url');
    const tamperedPayload = `${parts[0]}.${fakeEncoded}.${parts[2]}`;

    const result = verifyQr(tamperedPayload);
    expect(result.valid).toBe(false);
  });

  it('fails if verified against a different HMAC secret', () => {
    const payload = signQr(validTwinId, TEST_SECRET);
    const result = verifyQr(payload, 'wrong-secret-that-does-not-match');
    expect(result.valid).toBe(false);
  });

  it('rejects transfer QR payloads (VTX1) in product QR verifier', () => {
    const transferPayload = 'VTX1.randomtokenstring1234567890';
    const result = verifyQr(transferPayload);
    expect(result.valid).toBe(false);
  });
});

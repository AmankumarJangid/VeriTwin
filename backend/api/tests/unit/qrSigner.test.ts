import { describe, it, expect } from 'vitest';
import * as qrSigner from '../../src/services/qrSigner';

describe('QR Signer (HMAC-SHA256)', () => {
  it('signs and verifies a valid twin ID', () => {
    const twinId = '550e8400-e29b-41d4-a716-446655440000';
    const payload = qrSigner.sign(twinId);

    expect(payload).toMatch(/^VT1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const result = qrSigner.verify(payload);
    expect(result.valid).toBe(true);
    expect(result.twinId).toBe(twinId);
  });

  it('fails verification if payload is tampered with by 1 character', () => {
    const twinId = '550e8400-e29b-41d4-a716-446655440000';
    const payload = qrSigner.sign(twinId);

    // Tamper the last character of HMAC
    const lastChar = payload.slice(-1);
    const replacement = lastChar === 'A' ? 'B' : 'A';
    const tamperedPayload = payload.slice(0, -1) + replacement;

    const result = qrSigner.verify(tamperedPayload);
    expect(result.valid).toBe(false);
  });

  it('fails verification if prefix is invalid or not VT1', () => {
    expect(qrSigner.verify('INVALID.abc.def').valid).toBe(false);
    expect(qrSigner.verify('VTX1.abc.def').valid).toBe(false);
    expect(qrSigner.verify('').valid).toBe(false);
  });
});

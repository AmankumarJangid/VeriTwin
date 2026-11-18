import crypto from 'crypto';
import { env } from '../config/env';

export function sign(twinId: string): string {
  const prefix = 'VT1.' + Buffer.from(twinId).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', env.QR_HMAC_SECRET)
    .update('VT1.' + twinId)
    .digest('base64url');
  return `${prefix}.${hmac}`;
}

export function verify(payload: string): { valid: boolean; twinId?: string } {
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
    .createHmac('sha256', env.QR_HMAC_SECRET)
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

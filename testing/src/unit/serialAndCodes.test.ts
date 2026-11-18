import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function generateTwinCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const CAT3_MAP: Record<string, string> = {
  WATCH: 'WCH',
  APPAREL: 'APP',
  FOOTWEAR: 'FTW',
  ACCESSORY: 'ACC',
  OTHER: 'OTH',
};

function generateSerialNumber(category: string, year: number, seq: number): string {
  const cat3 = CAT3_MAP[category] ?? category.substring(0, 3).toUpperCase();
  return `VT-${cat3}-${year}-${seq.toString().padStart(6, '0')}`;
}

describe('Special Unit Test: Twin Code & Serial Number Formats', () => {
  it('generates a 32-bit hex code strictly 8 chars long in uppercase', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateTwinCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[0-9A-F]{8}$/);
      // Valid hex parses to an unsigned 32-bit integer
      const parsed = parseInt(code, 16);
      expect(parsed).toBeGreaterThanOrEqual(0);
      expect(parsed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('generates serial numbers matching the exact VT-<CAT3>-<YYYY>-<SEQ> contract spec', () => {
    expect(generateSerialNumber('WATCH', 2026, 123)).toBe('VT-WCH-2026-000123');
    expect(generateSerialNumber('APPAREL', 2026, 1)).toBe('VT-APP-2026-000001');
    expect(generateSerialNumber('FOOTWEAR', 2026, 45678)).toBe('VT-FTW-2026-045678');
    expect(generateSerialNumber('ACCESSORY', 2026, 999999)).toBe('VT-ACC-2026-999999');
    expect(generateSerialNumber('OTHER', 2026, 5)).toBe('VT-OTH-2026-000005');
  });

  it('handles fallback 3-letter uppercase for unknown product categories', () => {
    expect(generateSerialNumber('JEWELRY', 2026, 10)).toBe('VT-JEW-2026-000010');
  });
});

import { describe, it, expect } from 'vitest';
import * as serial from '../../src/services/serial';

describe('Serial and Twin Code Generation', () => {
  it('generates 8 uppercase hex characters for twin code', () => {
    const code = serial.generateTwinCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[0-9A-F]{8}$/);
  });

  it('generates unique codes across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => serial.generateTwinCode()));
    expect(codes.size).toBe(50);
  });

  it('formats serial numbers correctly with category prefix, year, and 6-digit sequence', () => {
    expect(serial.generateSerialNumber('WATCH', 2026, 1)).toBe('VT-WCH-2026-000001');
    expect(serial.generateSerialNumber('APPAREL', 2026, 123)).toBe('VT-APP-2026-000123');
    expect(serial.generateSerialNumber('FOOTWEAR', 2026, 9999)).toBe('VT-FTW-2026-009999');
    expect(serial.generateSerialNumber('ACCESSORY', 2026, 42)).toBe('VT-ACC-2026-000042');
  });
});

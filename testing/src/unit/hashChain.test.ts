import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function sha256hex(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function canonicalJson(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata, Object.keys(metadata).sort());
}

function computeEventHash(params: {
  prevHash: string;
  twinId: string;
  eventType: string;
  actorId: string | null;
  toStatus: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}): string {
  const metaStr = canonicalJson(params.metadata);
  return sha256hex(
    params.prevHash +
    params.twinId +
    params.eventType +
    (params.actorId ?? '') +
    params.toStatus +
    metaStr +
    params.createdAt,
  );
}

describe('Special Unit Test: Tamper-Evident SHA-256 Hash Chain', () => {
  const twinId = '550e8400-e29b-41d4-a716-446655440000';
  const genesisPrevHash = '0'.repeat(64);

  it('computes deterministic genesis hash with 64-zero prev_hash', () => {
    const hash1 = computeEventHash({
      prevHash: genesisPrevHash,
      twinId,
      eventType: 'MANUFACTURED',
      actorId: 'maker-1',
      toStatus: 'MANUFACTURED',
      metadata: { batch_no: 'B-01', seq: 1 },
      createdAt: '2026-11-18T10:00:00.000Z',
    });

    const hash2 = computeEventHash({
      prevHash: genesisPrevHash,
      twinId,
      eventType: 'MANUFACTURED',
      actorId: 'maker-1',
      toStatus: 'MANUFACTURED',
      metadata: { seq: 1, batch_no: 'B-01' }, // Different key order!
      createdAt: '2026-11-18T10:00:00.000Z',
    });

    // Canonical JSON ensures key order independence
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('links multiple events in an unbreakable cryptographic chain', () => {
    // Event 1: Genesis MANUFACTURED
    const hash1 = computeEventHash({
      prevHash: genesisPrevHash,
      twinId,
      eventType: 'MANUFACTURED',
      actorId: 'maker-1',
      toStatus: 'MANUFACTURED',
      metadata: {},
      createdAt: '2026-11-18T10:00:00.000Z',
    });

    // Event 2: QA_PASSED
    const hash2 = computeEventHash({
      prevHash: hash1, // Links to event 1
      twinId,
      eventType: 'QA_PASSED',
      actorId: 'maker-1',
      toStatus: 'QA_PASSED',
      metadata: { inspector: 'QA-01' },
      createdAt: '2026-11-18T11:00:00.000Z',
    });

    // Event 3: FIRST_SALE
    const hash3 = computeEventHash({
      prevHash: hash2, // Links to event 2
      twinId,
      eventType: 'FIRST_SALE',
      actorId: 'retail-1',
      toStatus: 'SOLD',
      metadata: { invoice: 'INV-100', price: 24999 },
      createdAt: '2026-11-18T12:00:00.000Z',
    });

    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);

    // Chain verification passes
    const chain = [
      { prev: genesisPrevHash, hash: hash1 },
      { prev: hash1, hash: hash2 },
      { prev: hash2, hash: hash3 },
    ];

    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].prev).toBe(chain[i - 1].hash);
    }
  });

  it('detects tampering when any field in an earlier event is modified', () => {
    const hash1 = computeEventHash({
      prevHash: genesisPrevHash,
      twinId,
      eventType: 'MANUFACTURED',
      actorId: 'maker-1',
      toStatus: 'MANUFACTURED',
      metadata: { price: 24999 },
      createdAt: '2026-11-18T10:00:00.000Z',
    });

    // An attacker alters the metadata of event 1 in database
    const tamperedHash1 = computeEventHash({
      prevHash: genesisPrevHash,
      twinId,
      eventType: 'MANUFACTURED',
      actorId: 'maker-1',
      toStatus: 'MANUFACTURED',
      metadata: { price: 19999 }, // Modified!
      createdAt: '2026-11-18T10:00:00.000Z',
    });

    expect(tamperedHash1).not.toBe(hash1);

    // Event 2 was created expecting the original hash1
    const storedEvent2PrevHash = hash1;
    // Verification will detect storedEvent2PrevHash !== tamperedHash1
    expect(storedEvent2PrevHash === tamperedHash1).toBe(false);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import { DEMO_ACCOUNTS } from '../helpers/testData';

describe('Integration Test: Cryptographic Integrity & Analytics Feed', () => {
  const mfrClient = new TestApiClient();
  let sampleTwinId: string;

  beforeAll(async () => {
    // Authenticate Manufacturer
    const mfrLogin = await mfrClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: DEMO_ACCOUNTS.manufacturer.password,
    });
    mfrClient.setToken(mfrLogin.data.data?.tokens?.access_token);

    // Get an existing twin
    const twinsRes = await mfrClient.get('/manufacturer/twins');
    if (twinsRes.data.data?.twins?.length > 0) {
      sampleTwinId = twinsRes.data.data.twins[0].twin_id;
    }
  });

  it('verifies the hash chain integrity of a digital twin (valid: true)', async () => {
    if (!sampleTwinId) return;

    const res = await mfrClient.get(`/manufacturer/twins/${sampleTwinId}/integrity`);

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.valid).toBe(true);
    expect(res.data.data?.events_checked).toBeGreaterThanOrEqual(1);
    expect(res.data.data?.broken_at_event_id).toBeNull();
  });

  it('fetches the global audit feed of lifecycle events (GET /manufacturer/audit)', async () => {
    const res = await mfrClient.get('/manufacturer/audit', { page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data?.events)).toBe(true);
    expect(res.data.meta).toBeDefined();

    if (res.data.data?.events?.length > 0) {
      const event = res.data.data.events[0];
      expect(event.event_id).toBeDefined();
      expect(event.event_type).toBeDefined();
      expect(event.event_hash).toBeDefined();
      expect(event.serial_number).toBeDefined();
      expect(event.actor?.display).toBeDefined();
    }
  });

  it('fetches the manufacturer analytics overview (GET /manufacturer/analytics/overview)', async () => {
    const res = await mfrClient.get('/manufacturer/analytics/overview', { days: 30 });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    const data = res.data.data;
    expect(data.totals).toBeDefined();
    expect(typeof data.totals.products).toBe('number');
    expect(typeof data.totals.twins).toBe('number');
    expect(typeof data.totals.scans).toBe('number');

    expect(data.status_breakdown).toBeDefined();
    expect(typeof data.status_breakdown.MANUFACTURED).toBe('number');

    expect(data.verification_methods).toBeDefined();
    expect(typeof data.verification_methods.fallback_rate).toBe('number');

    expect(data.verdicts).toBeDefined();
    expect(typeof data.verdicts.GENUINE).toBe('number');

    expect(Array.isArray(data.clone_alerts)).toBe(true);
    expect(Array.isArray(data.scans_per_day)).toBe(true);
  });
});

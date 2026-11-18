import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import { DEMO_ACCOUNTS } from '../helpers/testData';

describe('Integration Test: P2P Resale Handshake & Transfer Tokens', () => {
  const riyaClient = new TestApiClient();
  const arjunClient = new TestApiClient();

  let ownedTwinId: string;
  let transferId: string;
  let transferQrPayload: string;

  beforeAll(async () => {
    // Login Riya (Owner)
    const riyaLogin = await riyaClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer.email,
      password: DEMO_ACCOUNTS.consumer.password,
    });
    riyaClient.setToken(riyaLogin.data.data?.tokens?.access_token);

    // Login Arjun (Buyer)
    const arjunLogin = await arjunClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer2.email,
      password: DEMO_ACCOUNTS.consumer2.password,
    });
    arjunClient.setToken(arjunLogin.data.data?.tokens?.access_token);

    // Find a twin owned by Riya in her vault
    const vaultRes = await riyaClient.get('/consumer/vault');
    if (vaultRes.data.data?.items?.length > 0) {
      ownedTwinId = vaultRes.data.data.items[0].twin_id;
    }
  });

  it('Step 1: Seller (Riya) initiates transfer and receives 120s TTL QR payload', async () => {
    if (!ownedTwinId) return;

    const res = await riyaClient.post('/consumer/transfers', {
      twin_id: ownedTwinId,
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.status).toBe('PENDING');
    expect(res.data.data?.ttl_seconds).toBe(120);
    expect(res.data.data?.qr_payload.startsWith('VTX1.')).toBe(true);

    transferId = res.data.data?.transfer_id;
    transferQrPayload = res.data.data?.qr_payload;
    expect(transferId).toBeDefined();
  });

  it('Step 2: Seller polls transfer status while waiting for buyer (GET /consumer/transfers/:id)', async () => {
    if (!transferId) return;

    const res = await riyaClient.get(`/consumer/transfers/${transferId}`);

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.status).toBe('PENDING');
    expect(res.data.data?.claimed_at).toBeNull();
  });

  it('Step 3: Prevents self-claiming (Riya cannot claim her own transfer QR -> 400 CANNOT_CLAIM_OWN)', async () => {
    if (!transferQrPayload) return;

    const res = await riyaClient.post('/consumer/transfers/claim', {
      qr_payload: transferQrPayload,
    });

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('CANNOT_CLAIM_OWN');
  });

  it('Step 4: Buyer (Arjun) scans and claims the transfer successfully', async () => {
    if (!transferQrPayload) return;

    const res = await arjunClient.post('/consumer/transfers/claim', {
      qr_payload: transferQrPayload,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.twin?.owner?.full_name).toBe(DEMO_ACCOUNTS.consumer2.name);
    expect(res.data.data?.event?.event_type).toBe('RESOLD');
    expect(res.data.data?.transferred_at).toBeDefined();
  });

  it('Step 5: Replay protection prevents double claiming (409 TRANSFER_ALREADY_USED)', async () => {
    if (!transferQrPayload) return;

    const res = await arjunClient.post('/consumer/transfers/claim', {
      qr_payload: transferQrPayload,
    });

    expect(res.status).toBe(409);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('TRANSFER_ALREADY_USED');
  });

  it('Step 6: Verified ownership swap in Consumer vaults', async () => {
    if (!ownedTwinId) return;

    // Arjun now owns the twin
    const arjunVault = await arjunClient.get('/consumer/vault');
    const arjunHasIt = arjunVault.data.data?.items?.some((i: any) => i.twin_id === ownedTwinId);
    expect(arjunHasIt).toBe(true);

    // Riya no longer owns the twin
    const riyaVault = await riyaClient.get('/consumer/vault');
    const riyaHasIt = riyaVault.data.data?.items?.some((i: any) => i.twin_id === ownedTwinId);
    expect(riyaHasIt).toBe(false);
  });

  afterAll(async () => {
    // Revert ownership back to Riya for test idempotency
    try {
      if (ownedTwinId) {
        const revertRes = await arjunClient.post('/consumer/transfers', { twin_id: ownedTwinId });
        const revertQr = revertRes.data.data?.qr_payload;
        if (revertQr) {
          await riyaClient.post('/consumer/transfers/claim', { qr_payload: revertQr });
        }
      }
    } catch {
      // Ignored if revert fails
    }
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import { DEMO_ACCOUNTS, generateTestLogo } from '../helpers/testData';
import * as crypto from 'crypto';

describe('Integration Test: Dual-Mode Verification Scanner & Verdict Engine', () => {
  const mfrClient = new TestApiClient();
  const riyaClient = new TestApiClient();
  const arjunClient = new TestApiClient();

  let soldTwinQrPayload: string;
  let soldTwinId: string;
  let soldTwinCode: string;

  beforeAll(async () => {
    // Login Manufacturer
    const mfrLogin = await mfrClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: DEMO_ACCOUNTS.manufacturer.password,
    });
    mfrClient.setToken(mfrLogin.data.data?.tokens?.access_token);

    // Login Consumer Riya (Owner)
    const riyaLogin = await riyaClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer.email,
      password: DEMO_ACCOUNTS.consumer.password,
    });
    riyaClient.setToken(riyaLogin.data.data?.tokens?.access_token);

    // Login Consumer Arjun (Non-owner)
    const arjunLogin = await arjunClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer2.email,
      password: DEMO_ACCOUNTS.consumer2.password,
    });
    arjunClient.setToken(arjunLogin.data.data?.tokens?.access_token);

    // Fetch an already sold twin owned by Riya from manufacturer twins list
    const twinsRes = await mfrClient.get('/manufacturer/twins', { status: 'SOLD' });
    if (twinsRes.data.data?.twins?.length > 0) {
      const riyaTwin = twinsRes.data.data.twins.find(
        (t: any) => t.owner_name === DEMO_ACCOUNTS.consumer.name,
      ) ?? twinsRes.data.data.twins[0];
      soldTwinId = riyaTwin.twin_id;
      const detailRes = await mfrClient.get(`/manufacturer/twins/${soldTwinId}`);
      soldTwinQrPayload = detailRes.data.data?.assets?.fallback_qr_payload;
      soldTwinCode = detailRes.data.data?.twin?.twin_code;
    }
  });

  describe('Fallback QR Scanner (POST /products/scan-qr)', () => {
    it('returns GENUINE (is_owner: true) when scanned by the verified owner (Riya)', async () => {
      if (!soldTwinQrPayload) return;

      const res = await riyaClient.post('/products/scan-qr', {
        qr_payload: soldTwinQrPayload,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data?.verdict).toBe('GENUINE');
      expect(res.data.data?.is_owner).toBe(true);
      expect(res.data.data?.role_view).toBe('FULL');
      expect(res.data.data?.allowed_actions).toContain('INITIATE_TRANSFER');
    });

    it('returns ALREADY_CLAIMED (role_view: LIMITED) when scanned by a non-owner (Arjun)', async () => {
      if (!soldTwinQrPayload) return;

      const res = await arjunClient.post('/products/scan-qr', {
        qr_payload: soldTwinQrPayload,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data?.verdict).toBe('ALREADY_CLAIMED');
      expect(res.data.data?.is_owner).toBe(false);
      expect(res.data.data?.role_view).toBe('LIMITED');
      expect(res.data.data?.allowed_actions).toEqual([]);
      expect(res.data.data?.twin?.serial_number).toBeDefined();
      expect(res.data.data?.twin?.timeline).toBeUndefined(); // Masked
    });

    it('returns GENUINE (role_view: FULL) when scanned by MANUFACTURER (admin view)', async () => {
      if (!soldTwinQrPayload) return;

      const res = await mfrClient.post('/products/scan-qr', {
        qr_payload: soldTwinQrPayload,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data?.verdict).toBe('GENUINE');
      expect(res.data.data?.role_view).toBe('FULL');
      expect(res.data.data?.twin?.twin_code).toBeDefined(); // Admin sees twin_code
    });

    it('returns FAKE (reason: INVALID_SIGNATURE) when QR HMAC signature is forged', async () => {
      const parts = soldTwinQrPayload ? soldTwinQrPayload.split('.') : ['VT1', 'abc', 'def'];
      const tamperedPayload = `${parts[0]}.${parts[1]}.tampered_signature_xxxx`;

      const res = await arjunClient.post('/products/scan-qr', {
        qr_payload: tamperedPayload,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data?.verdict).toBe('FAKE');
      expect(res.data.data?.reason).toBe('INVALID_SIGNATURE');
    });

    it('rejects a P2P Transfer QR (VTX1.) in verify mode with 422 INVALID_QR_FORMAT (hint: TRANSFER_QR)', async () => {
      const transferQr = 'VTX1.sample_transfer_token_string_here_43chars';

      const res = await arjunClient.post('/products/scan-qr', {
        qr_payload: transferQr,
      });

      expect(res.status).toBe(422);
      expect(res.data.success).toBe(false);
      expect(res.data.error?.code).toBe('INVALID_QR_FORMAT');
      expect(res.data.error?.details?.hint).toBe('TRANSFER_QR');
    });
  });

  describe('Primary Logo Watermark Scanner (POST /products/scan-logo)', () => {
    it('returns 422 WATERMARK_LOW_CONFIDENCE with fallback trigger when mark cannot be read', async () => {
      const plainLogo = await generateTestLogo();

      const res = await arjunClient.postMultipart(
        '/products/scan-logo',
        {},
        {
          image: {
            buffer: plainLogo,
            filename: 'scan.png',
            contentType: 'image/png',
          },
        },
      );

      expect(res.status).toBe(422);
      expect(res.data.success).toBe(false);
      expect(res.data.error?.code).toBe('WATERMARK_LOW_CONFIDENCE');
      expect(res.data.error?.details?.fallback_required).toBe(true);
      expect(res.data.error?.details?.suggested_action).toBe('SWITCH_TO_QR');
    });

    it('verifies successfully when valid twin_code is decoded from logo', async () => {
      if (!soldTwinCode) return;

      const testImage = await generateTestLogo();

      // Pass mock header to simulate Python service decode
      const res = await riyaClient.postMultipart(
        '/products/scan-logo',
        {},
        {
          image: {
            buffer: testImage,
            filename: 'logo.png',
            contentType: 'image/png',
          },
        },
        {
          'x-mock-twin-code': soldTwinCode,
        },
      );

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data?.verification_method).toBe('WATERMARK');
      expect(res.data.data?.verdict).toBe('GENUINE');
    });
  });
});

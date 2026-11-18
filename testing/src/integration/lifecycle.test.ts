import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import {
  DEMO_ACCOUNTS,
  generateTestLogo,
  randomSku,
  randomBatchNo,
} from '../helpers/testData';

describe('Integration Test: Full Digital Twin Lifecycle Flow', () => {
  const mfrClient = new TestApiClient();
  const retClient = new TestApiClient();
  const consumerClient = new TestApiClient();

  let retailerUserId: string;
  let consumerUserId: string;
  let productId: string;
  let batchId: string;
  let twinId: string;
  let qrPayload: string;

  beforeAll(async () => {
    // Authenticate Manufacturer
    const mfrLogin = await mfrClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: DEMO_ACCOUNTS.manufacturer.password,
    });
    mfrClient.setToken(mfrLogin.data.data?.tokens?.access_token);

    // Authenticate Retailer
    const retLogin = await retClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.retailer.email,
      password: DEMO_ACCOUNTS.retailer.password,
    });
    retClient.setToken(retLogin.data.data?.tokens?.access_token);
    retailerUserId = retLogin.data.data?.user?.user_id || retLogin.data.data?.user?.id;

    // Authenticate Consumer
    const consumerLogin = await consumerClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer.email,
      password: DEMO_ACCOUNTS.consumer.password,
    });
    consumerClient.setToken(consumerLogin.data.data?.tokens?.access_token);
    consumerUserId = consumerLogin.data.data?.user?.user_id || consumerLogin.data.data?.user?.id;
  });

  it('Step 1: Manufacturer creates a new Product Master', async () => {
    const sku = randomSku();
    const res = await mfrClient.post('/manufacturer/products', {
      sku,
      name: 'Chrono Precision 44',
      brand: 'Aurelia Watches',
      category: 'WATCH',
      mrp: 35000,
      currency: 'INR',
      material: 'Titanium grade 5',
      specs: { case_mm: 44, movement: 'Automatic Caliber 8' },
      description: 'Test luxury timepiece for lifecycle verification',
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.product?.sku).toBe(sku);
    productId = res.data.data?.product?.product_id;
    expect(productId).toBeDefined();
  });

  it('Step 2: Manufacturer creates a Batch for the Product', async () => {
    const batchNo = randomBatchNo();
    const res = await mfrClient.post('/manufacturer/batches', {
      product_id: productId,
      batch_no: batchNo,
      planned_quantity: 10,
      manufactured_on: '2026-11-18',
      factory_location: 'Jodhpur, India',
      notes: 'Initial production batch for lifecycle testing',
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    batchId = res.data.data?.batch?.batch_id;
    expect(batchId).toBeDefined();
  });

  it('Step 3: Manufacturer creates Digital Twins with watermarked logo and QR assets', async () => {
    const logoBuffer = await generateTestLogo();

    const res = await mfrClient.postMultipart(
      '/manufacturer/twins',
      {
        product_id: productId,
        batch_id: batchId,
        quantity: 1,
      },
      {
        logo: {
          buffer: logoBuffer,
          filename: 'logo.png',
          contentType: 'image/png',
        },
      },
    );

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.count).toBe(1);

    const twin = res.data.data?.twins?.[0];
    expect(twin).toBeDefined();
    expect(twin.status).toBe('MANUFACTURED');
    expect(twin.serial_number).toMatch(/^VT-WCH-2026-\d{6}$/);
    expect(twin.twin_code).toMatch(/^[0-9A-F]{8}$/);
    expect(twin.watermarked_logo_url).toContain('/api/assets/watermarked/');
    expect(twin.fallback_qr_url).toContain('/api/assets/qr/');
    expect(twin.fallback_qr_payload.startsWith('VT1.')).toBe(true);

    twinId = twin.twin_id;
    qrPayload = twin.fallback_qr_payload;
  });

  it('Step 4: Manufacturer advances twin to QA_PASSED', async () => {
    const res = await mfrClient.post(`/manufacturer/twins/${twinId}/events`, {
      event_type: 'QA_PASSED',
      notes: 'Passed 10 ATM pressure and timing tests',
      metadata: { qa_station: 'QA-01' },
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.twin_status).toBe('QA_PASSED');
    expect(res.data.data?.event?.event_type).toBe('QA_PASSED');
  });

  it('Step 5: Manufacturer dispatches twin to Retailer (DISPATCHED_TO_RETAIL -> IN_TRANSIT)', async () => {
    const res = await mfrClient.post(`/manufacturer/twins/${twinId}/events`, {
      event_type: 'DISPATCHED_TO_RETAIL',
      notes: 'Dispatched via Secure Freight',
      metadata: { retailer_id: retailerUserId, shipment_no: 'SH-999' },
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.twin_status).toBe('IN_TRANSIT');
  });

  it('Step 6: Retailer sees twin in IN_TRANSIT inventory', async () => {
    const res = await retClient.get('/retailer/inventory', { status: 'IN_TRANSIT' });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const found = res.data.data?.twins?.some((t: any) => t.twin_id === twinId);
    expect(found).toBe(true);
  });

  it('Step 7: Retailer receives twin at store (RECEIVED_AT_RETAIL -> IN_RETAIL)', async () => {
    const res = await retClient.post(`/retailer/twins/${twinId}/events`, {
      event_type: 'RECEIVED_AT_RETAIL',
      notes: 'Shipment received, seals verified intact',
      metadata: { condition: 'OK' },
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.twin_status).toBe('IN_RETAIL');
  });

  it('Step 8: Retailer inspects the twin (status remains IN_RETAIL)', async () => {
    const res = await retClient.post(`/retailer/twins/${twinId}/events`, {
      event_type: 'INSPECTED',
      notes: 'Physical cosmetic and movement inspection OK',
      metadata: { condition: 'OK' },
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.twin_status).toBe('IN_RETAIL');
  });

  it('Step 9: Retailer looks up Consumer Riya by email', async () => {
    const res = await retClient.get('/retailer/consumers/lookup', {
      email: DEMO_ACCOUNTS.consumer.email,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.consumer?.full_name).toBe(DEMO_ACCOUNTS.consumer.name);
    expect(res.data.data?.consumer?.email_masked).toBe('r***@veritwin.dev');
  });

  it('Step 10: Retailer sells twin to Consumer Riya (FIRST_SALE -> SOLD)', async () => {
    const res = await retClient.post(`/retailer/twins/${twinId}/sell`, {
      consumer_id: consumerUserId,
      sale_price: 35000,
      invoice_no: 'INV-TEST-001',
      notes: 'Customer warranty registered in store',
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.status).toBe('SOLD');
    expect(res.data.data?.owner?.full_name).toBe(DEMO_ACCOUNTS.consumer.name);
  });

  it('Step 11: Consumer Riya sees the newly purchased twin in her Vault', async () => {
    const res = await consumerClient.get('/consumer/vault');

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const item = res.data.data?.items?.find((i: any) => i.twin_id === twinId);
    expect(item).toBeDefined();
    expect(item.acquired_via).toBe('FIRST_SALE');
  });
});

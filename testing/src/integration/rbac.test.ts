import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import { DEMO_ACCOUNTS } from '../helpers/testData';

describe('Integration Test: Role-Based Access Control (RBAC)', () => {
  const anonClient = new TestApiClient();
  const mfrClient = new TestApiClient();
  const retClient = new TestApiClient();
  const consumerClient = new TestApiClient();

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

    // Authenticate Consumer
    const consumerLogin = await consumerClient.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer.email,
      password: DEMO_ACCOUNTS.consumer.password,
    });
    consumerClient.setToken(consumerLogin.data.data?.tokens?.access_token);
  });

  it('rejects unauthenticated requests to protected endpoints with 401 UNAUTHENTICATED', async () => {
    const res = await anonClient.get('/manufacturer/products');
    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('UNAUTHENTICATED');
  });

  it('rejects malformed Bearer tokens with 401 UNAUTHENTICATED', async () => {
    const badClient = new TestApiClient();
    badClient.setToken('malformed.jwt.token');
    const res = await badClient.get('/consumer/vault');
    expect(res.status).toBe(401);
    expect(res.data.error?.code).toBe('UNAUTHENTICATED');
  });

  it('prevents CONSUMER from accessing MANUFACTURER endpoints (403 FORBIDDEN)', async () => {
    const res = await consumerClient.get('/manufacturer/products');
    expect(res.status).toBe(403);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });

  it('prevents CONSUMER from accessing RETAILER endpoints (403 FORBIDDEN)', async () => {
    const res = await consumerClient.get('/retailer/inventory');
    expect(res.status).toBe(403);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });

  it('prevents RETAILER from accessing MANUFACTURER endpoints (403 FORBIDDEN)', async () => {
    const res = await retClient.get('/manufacturer/twins');
    expect(res.status).toBe(403);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });

  it('prevents RETAILER from accessing CONSUMER vault endpoints (403 FORBIDDEN)', async () => {
    const res = await retClient.get('/consumer/vault');
    expect(res.status).toBe(403);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });

  it('prevents MANUFACTURER from accessing RETAILER inventory (403 FORBIDDEN)', async () => {
    const res = await mfrClient.get('/retailer/inventory');
    expect(res.status).toBe(403);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });
});

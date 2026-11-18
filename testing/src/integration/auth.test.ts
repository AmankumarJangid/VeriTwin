import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../client/apiClient';
import { DEMO_ACCOUNTS, randomEmail } from '../helpers/testData';

describe('Integration Test: Authentication & User Management', () => {
  const client = new TestApiClient();

  it('allows public registration of a CONSUMER account', async () => {
    const email = randomEmail();
    const res = await client.post('/auth/register', {
      full_name: 'Test Consumer',
      email,
      password: 'StrongPassword123!',
      role: 'CONSUMER',
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.user?.email).toBe(email);
    expect(res.data.data?.user?.role).toBe('CONSUMER');
    expect(res.data.data?.tokens?.access_token).toBeDefined();
    expect(res.data.data?.tokens?.refresh_token).toBeDefined();
    expect(res.data.data?.tokens?.expires_in).toBe(900);
  });

  it('allows registration of a MANUFACTURER with valid invite code and org name', async () => {
    const email = randomEmail();
    const res = await client.post('/auth/register', {
      full_name: 'Watchmaker Tech',
      email,
      password: 'StrongPassword123!',
      role: 'MANUFACTURER',
      organization_name: 'Swiss Craft Ltd',
      invite_code: 'MAKER-2026',
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.user?.role).toBe('MANUFACTURER');
    expect(res.data.data?.user?.organization_name).toBe('Swiss Craft Ltd');
  });

  it('rejects MANUFACTURER registration with invalid invite code (403 FORBIDDEN)', async () => {
    const res = await client.post('/auth/register', {
      full_name: 'Hacker',
      email: randomEmail(),
      password: 'StrongPassword123!',
      role: 'MANUFACTURER',
      organization_name: 'Fake Org',
      invite_code: 'WRONG_INVITE_CODE',
    });

    expect(res.status).toBe(403);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('FORBIDDEN');
  });

  it('rejects registration with missing organization name for RETAILER (400 VALIDATION_ERROR)', async () => {
    const res = await client.post('/auth/register', {
      full_name: 'Retail Partner',
      email: randomEmail(),
      password: 'StrongPassword123!',
      role: 'RETAILER',
      invite_code: 'RETAIL-2026',
    });

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration (409 CONFLICT)', async () => {
    const email = randomEmail();
    await client.post('/auth/register', {
      full_name: 'User 1',
      email,
      password: 'Password123!',
    });

    const dupRes = await client.post('/auth/register', {
      full_name: 'User 2',
      email,
      password: 'Password123!',
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.data.success).toBe(false);
    expect(dupRes.data.error?.code).toBe('CONFLICT');
  });

  it('logs in successfully with seeded demo accounts', async () => {
    const res = await client.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: DEMO_ACCOUNTS.manufacturer.password,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data?.user?.role).toBe('MANUFACTURER');
    expect(res.data.data?.tokens?.access_token).toBeDefined();
  });

  it('rejects login with wrong password (401 UNAUTHENTICATED)', async () => {
    const res = await client.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
    expect(res.data.error?.code).toBe('UNAUTHENTICATED');
  });

  it('rotates refresh token on /auth/refresh and revokes previous one', async () => {
    const loginRes = await client.post('/auth/login', {
      email: DEMO_ACCOUNTS.consumer.email,
      password: DEMO_ACCOUNTS.consumer.password,
    });
    const oldRefreshToken = loginRes.data.data?.tokens?.refresh_token;

    // Refresh token
    const refreshRes = await client.post('/auth/refresh', {
      refresh_token: oldRefreshToken,
    });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.data.success).toBe(true);
    const newRefreshToken = refreshRes.data.data?.tokens?.refresh_token;
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    // Attempting to reuse old refresh token should be rejected (401)
    const replayRes = await client.post('/auth/refresh', {
      refresh_token: oldRefreshToken,
    });
    expect(replayRes.status).toBe(401);
  });

  it('fetches authenticated user details on GET /auth/me', async () => {
    const loginRes = await client.post('/auth/login', {
      email: DEMO_ACCOUNTS.manufacturer.email,
      password: DEMO_ACCOUNTS.manufacturer.password,
    });
    const token = loginRes.data.data?.tokens?.access_token;
    client.setToken(token);

    const meRes = await client.get('/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.data.success).toBe(true);
    expect(meRes.data.data?.user?.email).toBe(DEMO_ACCOUNTS.manufacturer.email);
    expect(meRes.data.data?.user?.role).toBe('MANUFACTURER');
  });
});

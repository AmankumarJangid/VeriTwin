import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';
import {
  devSettings,
  mockUsers,
  mockProducts,
  mockBatches,
  mockTwins,
  mockRetailerSales,
  mockTransfers,
  generateSignedQrPayload,
} from './mockDatabase';
import {
  User,
  TwinView,
  TimelineEvent,
  AllowedAction,
  TwinStatus,
  Product,
  Batch,
  ScanResponseData,
} from '../../types/api';

export function setupMockAdapter(axiosInstance: AxiosInstance) {
  const mock = new MockAdapter(axiosInstance, { delayResponse: devSettings.simulatedLatency });

  // ------------------------------------------
  // Helper to extract active user from auth token
  // ------------------------------------------
  function getCurrentUser(config: any): User {
    const auth = config.headers?.Authorization || config.headers?.authorization;
    if (auth && typeof auth === 'string') {
      if (auth.includes('mfg') || auth.includes('maker')) return mockUsers[0];
      if (auth.includes('ret') || auth.includes('retail')) return mockUsers[1];
      if (auth.includes('arjun')) return mockUsers[3];
      if (auth.includes('riya') || auth.includes('con')) return mockUsers[2];
    }
    // Default fallback to Maker
    return mockUsers[0];
  }

  // ------------------------------------------
  // 1. Auth Endpoints (§7.1)
  // ------------------------------------------

  // POST /auth/login
  mock.onPost(/\/auth\/login/).reply((config) => {
    const { email, password } = JSON.parse(config.data || '{}');
    const user = mockUsers.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      return [
        401,
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Invalid email or password. Please check your credentials.',
          },
        },
      ];
    }

    return [
      200,
      {
        success: true,
        data: {
          user,
          tokens: {
            access_token: `mock_jwt_access_${user.role.toLowerCase()}_${user.user_id}`,
            refresh_token: `mock_jwt_refresh_${user.role.toLowerCase()}_${user.user_id}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // POST /auth/register
  mock.onPost(/\/auth\/register/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const existing = mockUsers.find((u) => u.email.toLowerCase() === (body.email || '').toLowerCase());

    if (existing) {
      return [
        409,
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'An account with this email address already exists.',
          },
        },
      ];
    }

    if (body.role && body.role !== 'CONSUMER' && !body.invite_code) {
      return [
        403,
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'An authorized invite code is required to register as Manufacturer or Retailer.',
          },
        },
      ];
    }

    const newUser: User = {
      user_id: `usr-${Date.now()}`,
      full_name: body.full_name || 'New User',
      email: body.email,
      role: body.role || 'CONSUMER',
      organization_name: body.organization_name || null,
      created_at: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return [
      201,
      {
        success: true,
        data: {
          user: newUser,
          tokens: {
            access_token: `mock_jwt_access_${newUser.role.toLowerCase()}_${newUser.user_id}`,
            refresh_token: `mock_jwt_refresh_${newUser.role.toLowerCase()}_${newUser.user_id}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // POST /auth/refresh
  mock.onPost(/\/auth\/refresh/).reply(() => {
    return [
      200,
      {
        success: true,
        data: {
          tokens: {
            access_token: `mock_jwt_access_refreshed_${Date.now()}`,
            refresh_token: `mock_jwt_refresh_refreshed_${Date.now()}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // POST /auth/logout
  mock.onPost(/\/auth\/logout/).reply(() => {
    return [200, { success: true, data: { logged_out: true } }];
  });

  // GET /auth/me
  mock.onGet(/\/auth\/me/).reply((config) => {
    const user = getCurrentUser(config);
    return [200, { success: true, data: { user } }];
  });

  // ------------------------------------------
  // 2. Manufacturer Endpoints (§7.2)
  // ------------------------------------------

  // GET /manufacturer/products
  mock.onGet(/\/manufacturer\/products(\?.*)?$/).reply((config) => {
    const url = new URL(config.url || '', 'http://dummy.com');
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q')?.toLowerCase();

    let list = [...mockProducts];
    if (category) {
      list = list.filter((p) => p.category === category);
    }
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    return [
      200,
      {
        success: true,
        data: { products: list },
        meta: { page: 1, limit: 20, total: list.length, total_pages: 1 },
      },
    ];
  });

  // POST /manufacturer/products
  mock.onPost(/\/manufacturer\/products$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const exists = mockProducts.find((p) => p.sku === body.sku);
    if (exists) {
      return [
        409,
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Product with SKU ${body.sku} already exists.`,
          },
        },
      ];
    }

    const newProd: Product = {
      product_id: `prod-${Date.now()}`,
      sku: body.sku,
      name: body.name,
      brand: body.brand,
      category: body.category || 'OTHER',
      mrp: Number(body.mrp) || 0,
      currency: 'INR',
      material: body.material || '',
      specs: body.specs || {},
      description: body.description || '',
      created_at: new Date().toISOString(),
    };

    mockProducts.push(newProd);
    return [201, { success: true, data: { product: newProd } }];
  });

  // GET /manufacturer/products/:id
  mock.onGet(/\/manufacturer\/products\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const prodId = parts[parts.length - 1].split('?')[0];
    const product = mockProducts.find((p) => p.product_id === prodId);

    if (!product) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } }];
    }

    const matchingTwins = mockTwins.filter((t) => t.product.product_id === prodId);
    return [
      200,
      {
        success: true,
        data: {
          product,
          stats: {
            twins_total: matchingTwins.length,
            sold: matchingTwins.filter((t) => t.status === 'SOLD').length,
            in_retail: matchingTwins.filter((t) => t.status === 'IN_RETAIL').length,
          },
        },
      },
    ];
  });

  // PATCH /manufacturer/products/:id
  mock.onPatch(/\/manufacturer\/products\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const prodId = parts[parts.length - 1];
    const index = mockProducts.findIndex((p) => p.product_id === prodId);

    if (index === -1) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } }];
    }

    const updates = JSON.parse(config.data || '{}');
    mockProducts[index] = { ...mockProducts[index], ...updates };
    return [200, { success: true, data: { product: mockProducts[index] } }];
  });

  // GET /manufacturer/batches
  mock.onGet(/\/manufacturer\/batches(\?.*)?$/).reply((config) => {
    const url = new URL(config.url || '', 'http://dummy.com');
    const prodId = url.searchParams.get('product_id');

    let list = [...mockBatches];
    if (prodId) {
      list = list.filter((b) => b.product_id === prodId);
    }

    return [
      200,
      {
        success: true,
        data: { batches: list },
        meta: { page: 1, limit: 20, total: list.length, total_pages: 1 },
      },
    ];
  });

  // POST /manufacturer/batches
  mock.onPost(/\/manufacturer\/batches$/).reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const existing = mockBatches.find((b) => b.batch_no === body.batch_no);
    if (existing) {
      return [
        409,
        {
          success: false,
          error: { code: 'CONFLICT', message: `Batch ${body.batch_no} already exists.` },
        },
      ];
    }

    const newBatch: Batch = {
      batch_id: `batch-${Date.now()}`,
      batch_no: body.batch_no,
      product_id: body.product_id,
      planned_quantity: Number(body.planned_quantity) || 10,
      manufactured_on: body.manufactured_on || new Date().toISOString().split('T')[0],
      factory_location: body.factory_location || 'Factory HQ',
      notes: body.notes || '',
      created_at: new Date().toISOString(),
      twins_count: 0,
    };

    mockBatches.push(newBatch);
    return [201, { success: true, data: { batch: newBatch } }];
  });

  // POST /manufacturer/twins (Create twins)
  mock.onPost(/\/manufacturer\/twins$/).reply((config) => {
    // In multipart or json:
    let productId = 'prod-wch-001';
    let batchId = 'batch-2026-11-a';
    let quantity = 1;

    if (typeof config.data === 'string' && config.data.startsWith('{')) {
      try {
        const parsed = JSON.parse(config.data);
        productId = parsed.product_id || productId;
        batchId = parsed.batch_id || batchId;
        quantity = Number(parsed.quantity) || 1;
      } catch {}
    }

    const product = mockProducts.find((p) => p.product_id === productId) || mockProducts[0];
    const batch = mockBatches.find((b) => b.batch_id === batchId) || mockBatches[0];

    const createdTwins = [];
    for (let i = 0; i < quantity; i++) {
      const twinId = `twin-${Date.now()}-${i + 1}`;
      const serialNum = `VT-${product.category.slice(0, 3)}-2026-${String(mockTwins.length + 101).padStart(6, '0')}`;
      const twinCode = Math.random().toString(16).substring(2, 10).toUpperCase();

      const newTwin: TwinView = {
        twin_id: twinId,
        serial_number: serialNum,
        twin_code: twinCode,
        status: 'MANUFACTURED',
        product,
        batch: {
          batch_id: batch.batch_id,
          batch_no: batch.batch_no,
          manufactured_on: batch.manufactured_on,
          factory_location: batch.factory_location,
        },
        current_retailer: null,
        owner: null,
        claimed_at: null,
        timeline: [
          {
            event_id: `ev-${Date.now()}-${i}`,
            event_type: 'MANUFACTURED',
            from_status: null,
            to_status: 'MANUFACTURED',
            actor: {
              user_id: 'usr-mfg-001',
              display: 'Aurelia Production Lead',
              role: 'MANUFACTURER',
            },
            notes: 'Twin genesis created with imperceptible watermark & signed QR',
            created_at: new Date().toISOString(),
            event_hash: Math.random().toString(16).substring(2, 18),
          },
        ],
      };

      mockTwins.unshift(newTwin);

      createdTwins.push({
        twin_id: twinId,
        serial_number: serialNum,
        twin_code: twinCode,
        status: 'MANUFACTURED' as TwinStatus,
        watermarked_logo_url: `https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80`,
        fallback_qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateSignedQrPayload(twinId))}`,
        fallback_qr_payload: generateSignedQrPayload(twinId),
        created_at: new Date().toISOString(),
      });
    }

    if (batch.twins_count !== undefined) {
      batch.twins_count += quantity;
    }

    return [
      201,
      {
        success: true,
        data: {
          count: createdTwins.length,
          twins: createdTwins,
        },
      },
    ];
  });

  // GET /manufacturer/twins
  mock.onGet(/\/manufacturer\/twins(\?.*)?$/).reply((config) => {
    const url = new URL(config.url || '', 'http://dummy.com');
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q')?.toLowerCase();

    let list = [...mockTwins];
    if (status) {
      list = list.filter((t) => t.status === status);
    }
    if (q) {
      list = list.filter(
        (t) =>
          t.serial_number.toLowerCase().includes(q) ||
          t.product.name.toLowerCase().includes(q)
      );
    }

    const mapped = list.map((t) => ({
      twin_id: t.twin_id,
      serial_number: t.serial_number,
      status: t.status,
      product: {
        name: t.product.name,
        sku: t.product.sku,
      },
      batch_no: t.batch.batch_no,
      current_retailer_name: t.current_retailer?.organization_name || null,
      owner_name: t.owner?.full_name || null,
      created_at: t.timeline[0]?.created_at || new Date().toISOString(),
    }));

    return [
      200,
      {
        success: true,
        data: { twins: mapped },
        meta: { page: 1, limit: 20, total: mapped.length, total_pages: 1 },
      },
    ];
  });

  // GET /manufacturer/twins/:id
  mock.onGet(/\/manufacturer\/twins\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 1].split('?')[0];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Digital Twin not found.' } }];
    }

    return [
      200,
      {
        success: true,
        data: {
          twin,
          assets: {
            watermarked_logo_url: `https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80`,
            fallback_qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateSignedQrPayload(twin.twin_id))}`,
            fallback_qr_payload: generateSignedQrPayload(twin.twin_id),
          },
        },
      },
    ];
  });

  // POST /manufacturer/twins/:id/events
  mock.onPost(/\/manufacturer\/twins\/[^/?]+\/events$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 2];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Digital Twin not found.' } }];
    }

    const { event_type, notes, metadata } = JSON.parse(config.data || '{}');

    if (event_type === 'QA_PASSED') {
      if (twin.status !== 'MANUFACTURED') {
        return [
          409,
          {
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: 'Cannot mark QA_PASSED from current status.',
              details: { current_status: twin.status, allowed_from: 'MANUFACTURED' },
            },
          },
        ];
      }
      twin.status = 'QA_PASSED';
    } else if (event_type === 'DISPATCHED_TO_RETAIL') {
      if (twin.status !== 'QA_PASSED') {
        return [
          409,
          {
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: 'Cannot dispatch to retail before QA is passed.',
              details: { current_status: twin.status, allowed_from: 'QA_PASSED' },
            },
          },
        ];
      }
      twin.status = 'IN_TRANSIT';
      twin.current_retailer = {
        user_id: metadata?.retailer_id || 'usr-ret-001',
        organization_name: 'TimeHouse Retail',
      };
    }

    const newEvent: TimelineEvent = {
      event_id: `ev-${Date.now()}`,
      event_type,
      from_status: twin.status,
      to_status: twin.status,
      actor: {
        user_id: 'usr-mfg-001',
        display: 'Aurelia Production Lead',
        role: 'MANUFACTURER',
      },
      notes: notes || '',
      metadata,
      created_at: new Date().toISOString(),
      event_hash: Math.random().toString(16).substring(2, 18),
    };

    twin.timeline.push(newEvent);

    return [
      201,
      {
        success: true,
        data: {
          event: newEvent,
          twin_status: twin.status,
        },
      },
    ];
  });

  // POST /manufacturer/batches/:id/events (Bulk)
  mock.onPost(/\/manufacturer\/batches\/[^/?]+\/events$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const batchId = parts[parts.length - 2];
    const { event_type, notes, retailer_id } = JSON.parse(config.data || '{}');

    const twinsInBatch = mockTwins.filter((t) => t.batch.batch_id === batchId);
    let updated = 0;
    const skipped: any[] = [];

    twinsInBatch.forEach((t) => {
      if (event_type === 'QA_PASSED' && t.status === 'MANUFACTURED') {
        t.status = 'QA_PASSED';
        t.timeline.push({
          event_id: `ev-${Date.now()}-${t.twin_id}`,
          event_type: 'QA_PASSED',
          from_status: 'MANUFACTURED',
          to_status: 'QA_PASSED',
          actor: { user_id: 'usr-mfg-001', display: 'Aurelia QC', role: 'MANUFACTURER' },
          notes: notes || 'Bulk QA Pass',
          created_at: new Date().toISOString(),
          event_hash: Math.random().toString(16).substring(2, 18),
        });
        updated++;
      } else if (event_type === 'DISPATCHED_TO_RETAIL' && t.status === 'QA_PASSED') {
        t.status = 'IN_TRANSIT';
        t.current_retailer = {
          user_id: retailer_id || 'usr-ret-001',
          organization_name: 'TimeHouse Retail',
        };
        t.timeline.push({
          event_id: `ev-${Date.now()}-${t.twin_id}`,
          event_type: 'DISPATCHED_TO_RETAIL',
          from_status: 'QA_PASSED',
          to_status: 'IN_TRANSIT',
          actor: { user_id: 'usr-mfg-001', display: 'Aurelia Dispatch', role: 'MANUFACTURER' },
          notes: notes || 'Bulk Dispatch',
          metadata: { retailer_id },
          created_at: new Date().toISOString(),
          event_hash: Math.random().toString(16).substring(2, 18),
        });
        updated++;
      } else {
        skipped.push({
          twin_id: t.twin_id,
          reason: 'INVALID_STATE_TRANSITION',
          current_status: t.status,
        });
      }
    });

    return [
      200,
      {
        success: true,
        data: { updated, skipped },
      },
    ];
  });

  // GET /manufacturer/retailers
  mock.onGet(/\/manufacturer\/retailers$/).reply(() => {
    return [
      200,
      {
        success: true,
        data: {
          retailers: [
            {
              user_id: 'usr-ret-001',
              organization_name: 'TimeHouse Retail',
              email: 'retail@veritwin.dev',
            },
            {
              user_id: 'usr-ret-002',
              organization_name: 'Helios Luxury Boutique',
              email: 'helios@veritwin.dev',
            },
            {
              user_id: 'usr-ret-003',
              organization_name: 'Ethos Flagship Store',
              email: 'ethos@veritwin.dev',
            },
          ],
        },
      },
    ];
  });

  // GET /manufacturer/analytics/overview
  mock.onGet(/\/manufacturer\/analytics\/overview(\?.*)?$/).reply(() => {
    const totalTwins = mockTwins.length;
    const manufactured = mockTwins.filter((t) => t.status === 'MANUFACTURED').length;
    const qaPassed = mockTwins.filter((t) => t.status === 'QA_PASSED').length;
    const inTransit = mockTwins.filter((t) => t.status === 'IN_TRANSIT').length;
    const inRetail = mockTwins.filter((t) => t.status === 'IN_RETAIL').length;
    const sold = mockTwins.filter((t) => t.status === 'SOLD').length;

    return [
      200,
      {
        success: true,
        data: {
          totals: {
            products: mockProducts.length,
            batches: mockBatches.length,
            twins: totalTwins,
            scans: 812,
          },
          status_breakdown: {
            MANUFACTURED: manufactured,
            QA_PASSED: qaPassed,
            IN_TRANSIT: inTransit,
            IN_RETAIL: inRetail,
            SOLD: sold,
          },
          verification_methods: {
            WATERMARK: 600,
            QR: 212,
            fallback_rate: 0.26,
          },
          verdicts: {
            GENUINE: 700,
            FAKE: 45,
            ALREADY_CLAIMED: 67,
          },
          clone_alerts: [
            {
              twin_id: 'twin-002-sold-riya',
              serial_number: 'VT-WCH-2026-000102',
              already_claimed_scans: 6,
              last_seen: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          scans_per_day: [
            { date: '2026-11-12', watermark: 18, qr: 4, fake: 0 },
            { date: '2026-11-13', watermark: 25, qr: 7, fake: 2 },
            { date: '2026-11-14', watermark: 30, qr: 9, fake: 1 },
            { date: '2026-11-15', watermark: 42, qr: 14, fake: 3 },
            { date: '2026-11-16', watermark: 38, qr: 11, fake: 0 },
            { date: '2026-11-17', watermark: 52, qr: 18, fake: 4 },
            { date: '2026-11-18', watermark: 61, qr: 20, fake: 1 },
          ],
        },
      },
    ];
  });

  // GET /manufacturer/audit
  mock.onGet(/\/manufacturer\/audit(\?.*)?$/).reply(() => {
    const allEvents: any[] = [];
    mockTwins.forEach((t) => {
      t.timeline.forEach((e) => {
        allEvents.push({
          ...e,
          twin_id: t.twin_id,
          serial_number: t.serial_number,
        });
      });
    });

    allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return [
      200,
      {
        success: true,
        data: { events: allEvents },
        meta: { page: 1, limit: 50, total: allEvents.length, total_pages: 1 },
      },
    ];
  });

  // GET /manufacturer/twins/:id/integrity
  mock.onGet(/\/manufacturer\/twins\/[^/?]+\/integrity$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 2];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found.' } }];
    }

    return [
      200,
      {
        success: true,
        data: {
          valid: true,
          events_checked: twin.timeline.length,
          broken_at_event_id: null,
        },
      },
    ];
  });

  // ------------------------------------------
  // 3. Retailer Endpoints (§7.3)
  // ------------------------------------------

  // GET /retailer/inventory
  mock.onGet(/\/retailer\/inventory(\?.*)?$/).reply((config) => {
    const url = new URL(config.url || '', 'http://dummy.com');
    const statusParam = url.searchParams.get('status');

    let matching = mockTwins.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'IN_RETAIL');

    const inTransitCount = matching.filter((t) => t.status === 'IN_TRANSIT').length;
    const inRetailCount = matching.filter((t) => t.status === 'IN_RETAIL').length;

    if (statusParam) {
      matching = matching.filter((t) => t.status === statusParam);
    }

    const items = matching.map((t) => {
      const dispEvent = t.timeline.find((e) => e.event_type === 'DISPATCHED_TO_RETAIL');
      const recEvent = t.timeline.find((e) => e.event_type === 'RECEIVED_AT_RETAIL');
      return {
        twin_id: t.twin_id,
        serial_number: t.serial_number,
        status: t.status,
        product: {
          name: t.product.name,
          sku: t.product.sku,
          mrp: t.product.mrp,
        },
        dispatched_at: dispEvent?.created_at || t.timeline[0]?.created_at,
        received_at: recEvent?.created_at,
      };
    });

    return [
      200,
      {
        success: true,
        data: {
          twins: items,
          counts: {
            IN_TRANSIT: inTransitCount,
            IN_RETAIL: inRetailCount,
          },
        },
        meta: { page: 1, limit: 20, total: items.length, total_pages: 1 },
      },
    ];
  });

  // POST /retailer/twins/:id/events
  mock.onPost(/\/retailer\/twins\/[^/?]+\/events$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 2];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found.' } }];
    }

    const { event_type, notes, metadata } = JSON.parse(config.data || '{}');

    if (event_type === 'RECEIVED_AT_RETAIL') {
      if (twin.status !== 'IN_TRANSIT') {
        return [
          409,
          {
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: 'Only units in IN_TRANSIT can be marked received.',
              details: { current_status: twin.status, allowed_from: 'IN_TRANSIT' },
            },
          },
        ];
      }
      twin.status = 'IN_RETAIL';
    } else if (event_type === 'INSPECTED') {
      if (twin.status !== 'IN_RETAIL') {
        return [
          409,
          {
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: 'Only stocked retail units can be inspected.',
              details: { current_status: twin.status, allowed_from: 'IN_RETAIL' },
            },
          },
        ];
      }
    }

    const newEvent: TimelineEvent = {
      event_id: `ev-${Date.now()}`,
      event_type,
      from_status: twin.status,
      to_status: twin.status,
      actor: {
        user_id: 'usr-ret-001',
        display: 'TimeHouse Retail',
        role: 'RETAILER',
      },
      notes: notes || '',
      metadata,
      created_at: new Date().toISOString(),
      event_hash: Math.random().toString(16).substring(2, 18),
    };

    twin.timeline.push(newEvent);

    return [
      201,
      {
        success: true,
        data: {
          event: newEvent,
          twin_status: twin.status,
        },
      },
    ];
  });

  // GET /retailer/consumers/lookup
  mock.onGet(/\/retailer\/consumers\/lookup(\?.*)?$/).reply((config) => {
    const url = new URL(config.url || '', 'http://dummy.com');
    const email = url.searchParams.get('email')?.toLowerCase();

    const consumer = mockUsers.find(
      (u) => u.role === 'CONSUMER' && u.email.toLowerCase() === email
    );

    if (!consumer) {
      return [
        404,
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No registered consumer found with this email address.',
          },
        },
      ];
    }

    const emailParts = consumer.email.split('@');
    const emailMasked = `${emailParts[0].charAt(0)}***@${emailParts[1]}`;

    return [
      200,
      {
        success: true,
        data: {
          consumer: {
            user_id: consumer.user_id,
            full_name: consumer.full_name,
            email_masked: emailMasked,
          },
        },
      },
    ];
  });

  // POST /retailer/twins/:id/sell
  mock.onPost(/\/retailer\/twins\/[^/?]+\/sell$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 2];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found.' } }];
    }

    if (twin.status !== 'IN_RETAIL') {
      return [
        409,
        {
          success: false,
          error: {
            code: 'INVALID_STATE_TRANSITION',
            message: 'Unit must be in IN_RETAIL status to complete a sale.',
            details: { current_status: twin.status, allowed_from: 'IN_RETAIL' },
          },
        },
      ];
    }

    const { consumer_id, sale_price, invoice_no, notes } = JSON.parse(config.data || '{}');
    const consumer = mockUsers.find((u) => u.user_id === consumer_id);

    if (!consumer) {
      return [
        404,
        { success: false, error: { code: 'NOT_FOUND', message: 'Target consumer not found.' } },
      ];
    }

    twin.status = 'SOLD';
    twin.owner = {
      user_id: consumer.user_id,
      full_name: consumer.full_name,
    };
    twin.claimed_at = new Date().toISOString();

    const saleEvent: TimelineEvent = {
      event_id: `ev-sale-${Date.now()}`,
      event_type: 'FIRST_SALE',
      from_status: 'IN_RETAIL',
      to_status: 'SOLD',
      actor: {
        user_id: 'usr-ret-001',
        display: 'TimeHouse Retail',
        role: 'RETAILER',
      },
      notes: notes || `Sold under invoice ${invoice_no}`,
      metadata: { invoice_no, sale_price },
      created_at: new Date().toISOString(),
      event_hash: Math.random().toString(16).substring(2, 18),
    };

    twin.timeline.push(saleEvent);

    mockRetailerSales.unshift({
      twin_id: twin.twin_id,
      serial_number: twin.serial_number,
      product_name: twin.product.name,
      consumer_name: consumer.full_name,
      sale_price: sale_price || twin.product.mrp,
      invoice_no: invoice_no || 'INV-POS-01',
      sold_at: new Date().toISOString(),
    });

    return [
      200,
      {
        success: true,
        data: {
          twin_id: twin.twin_id,
          status: 'SOLD',
          owner: {
            user_id: consumer.user_id,
            full_name: consumer.full_name,
          },
          event: saleEvent,
        },
      },
    ];
  });

  // GET /retailer/sales
  mock.onGet(/\/retailer\/sales(\?.*)?$/).reply(() => {
    return [
      200,
      {
        success: true,
        data: { sales: mockRetailerSales },
        meta: { page: 1, limit: 20, total: mockRetailerSales.length, total_pages: 1 },
      },
    ];
  });

  // ------------------------------------------
  // 4. Consumer Endpoints (§7.4)
  // ------------------------------------------

  // GET /consumer/vault
  mock.onGet(/\/consumer\/vault(\?.*)?$/).reply((config) => {
    const user = getCurrentUser(config);
    const owned = mockTwins.filter((t) => t.status === 'SOLD' && t.owner?.user_id === user.user_id);

    const vaultItems = owned.map((t) => {
      const activeTransfer = mockTransfers.find(
        (tr) => tr.twin_id === t.twin_id && tr.status === 'PENDING'
      );
      const isResold = t.timeline.some((e) => e.event_type === 'RESOLD');
      return {
        twin_id: t.twin_id,
        serial_number: t.serial_number,
        product: {
          name: t.product.name,
          brand: t.product.brand,
          mrp: t.product.mrp,
        },
        acquired_at: t.claimed_at || t.timeline[t.timeline.length - 1]?.created_at,
        acquired_via: (isResold ? 'RESOLD' : 'FIRST_SALE') as 'FIRST_SALE' | 'RESOLD',
        has_active_transfer: !!activeTransfer,
      };
    });

    return [
      200,
      {
        success: true,
        data: { items: vaultItems },
        meta: { page: 1, limit: 20, total: vaultItems.length, total_pages: 1 },
      },
    ];
  });

  // GET /consumer/vault/:twinId
  mock.onGet(/\/consumer\/vault\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 1].split('?')[0];
    const twin = mockTwins.find((t) => t.twin_id === twinId);

    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Item not found in vault.' } }];
    }

    // Consumer masking for timeline
    const maskedTwin: TwinView = {
      ...twin,
      current_retailer: null, // masked for consumer
      timeline: twin.timeline.map((ev) => {
        if (ev.actor.role === 'CONSUMER') {
          return {
            ...ev,
            actor: {
              user_id: null,
              display: 'Owner',
              role: 'CONSUMER',
            },
          };
        }
        return ev;
      }),
    };

    return [200, { success: true, data: { twin: maskedTwin } }];
  });

  // POST /consumer/transfers
  mock.onPost(/\/consumer\/transfers$/).reply((config) => {
    const user = getCurrentUser(config);
    const { twin_id } = JSON.parse(config.data || '{}');
    const twin = mockTwins.find((t) => t.twin_id === twin_id);

    if (!twin || twin.owner?.user_id !== user.user_id) {
      return [
        403,
        {
          success: false,
          error: {
            code: 'NOT_OWNER',
            message: 'You can only initiate transfers for items you own.',
          },
        },
      ];
    }

    // Cancel existing pending transfers for this twin
    mockTransfers.forEach((tr) => {
      if (tr.twin_id === twin_id && tr.status === 'PENDING') {
        tr.status = 'CANCELLED';
      }
    });

    const transferId = `tr-${Date.now()}`;
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const qrPayload = `VTX1.${token}`;
    const ttlSeconds = 120;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const newTransfer: any = {
      transfer_id: transferId,
      twin_id,
      seller_id: user.user_id,
      qr_payload: qrPayload,
      status: 'PENDING',
      ttl_seconds: ttlSeconds,
      expires_at: expiresAt,
      claimed_at: null,
      created_at: Date.now(),
    };

    mockTransfers.push(newTransfer);

    return [
      201,
      {
        success: true,
        data: {
          transfer_id: transferId,
          twin_id,
          qr_payload: qrPayload,
          status: 'PENDING',
          ttl_seconds: ttlSeconds,
          expires_at: expiresAt,
        },
      },
    ];
  });

  // GET /consumer/transfers/:id (Polling)
  mock.onGet(/\/consumer\/transfers\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const transferId = parts[parts.length - 1];
    const transfer = mockTransfers.find((tr) => tr.transfer_id === transferId);

    if (!transfer) {
      return [
        404,
        { success: false, error: { code: 'TRANSFER_INVALID', message: 'Transfer session not found.' } },
      ];
    }

    // DevMenu Scenario: Auto-claim after 5 seconds if set
    if (
      devSettings.transferScenario === 'CLAIMED_AFTER_5S' &&
      transfer.status === 'PENDING' &&
      Date.now() - transfer.created_at > 5000
    ) {
      transfer.status = 'CLAIMED';
      transfer.claimed_at = new Date().toISOString();
      const twin = mockTwins.find((t) => t.twin_id === transfer.twin_id);
      if (twin) {
        // Transfer to Arjun
        twin.owner = { user_id: 'usr-con-arjun', full_name: 'Arjun Mehta' };
        twin.timeline.push({
          event_id: `ev-resold-${Date.now()}`,
          event_type: 'RESOLD',
          from_status: 'SOLD',
          to_status: 'SOLD',
          actor: { user_id: null, display: 'Peer Transfer Handshake', role: 'CONSUMER' },
          notes: 'Ownership transferred via P2P cryptographically signed handover.',
          created_at: new Date().toISOString(),
          event_hash: Math.random().toString(16).substring(2, 18),
        });
      }
    }

    return [
      200,
      {
        success: true,
        data: {
          transfer_id: transfer.transfer_id,
          status: transfer.status,
          expires_at: transfer.expires_at,
          claimed_at: transfer.claimed_at,
        },
      },
    ];
  });

  // DELETE /consumer/transfers/:id
  mock.onDelete(/\/consumer\/transfers\/[^/?]+$/).reply((config) => {
    const parts = (config.url || '').split('/');
    const transferId = parts[parts.length - 1];
    const transfer = mockTransfers.find((tr) => tr.transfer_id === transferId);

    if (transfer) {
      transfer.status = 'CANCELLED';
    }

    return [200, { success: true, data: { transfer_id: transferId, status: 'CANCELLED' } }];
  });

  // POST /consumer/transfers/claim
  mock.onPost(/\/consumer\/transfers\/claim$/).reply((config) => {
    const buyer = getCurrentUser(config);
    const { qr_payload } = JSON.parse(config.data || '{}');

    if (!qr_payload || !qr_payload.startsWith('VTX1.')) {
      return [
        422,
        {
          success: false,
          error: {
            code: 'INVALID_QR_FORMAT',
            message: 'That is not a valid VeriTwin transfer QR code.',
          },
        },
      ];
    }

    const transfer = mockTransfers.find((tr) => tr.qr_payload === qr_payload);
    if (!transfer) {
      return [
        404,
        {
          success: false,
          error: {
            code: 'TRANSFER_INVALID',
            message: 'Transfer token not recognized or does not exist.',
          },
        },
      ];
    }

    if (transfer.status === 'EXPIRED' || new Date(transfer.expires_at).getTime() < Date.now()) {
      transfer.status = 'EXPIRED';
      return [
        410,
        {
          success: false,
          error: {
            code: 'TRANSFER_EXPIRED',
            message: 'This transfer QR has expired. Ask the seller to generate a new code.',
          },
        },
      ];
    }

    if (transfer.status === 'CLAIMED' || transfer.status === 'CANCELLED') {
      return [
        409,
        {
          success: false,
          error: {
            code: 'TRANSFER_ALREADY_USED',
            message: 'This transfer code has already been claimed or was cancelled.',
          },
        },
      ];
    }

    if (transfer.seller_id === buyer.user_id) {
      return [
        400,
        {
          success: false,
          error: {
            code: 'CANNOT_CLAIM_OWN',
            message: 'You cannot claim an item you already own.',
          },
        },
      ];
    }

    const twin = mockTwins.find((t) => t.twin_id === transfer.twin_id);
    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found.' } }];
    }

    // Atomically transfer ownership
    transfer.status = 'CLAIMED';
    transfer.claimed_at = new Date().toISOString();
    twin.owner = {
      user_id: buyer.user_id,
      full_name: buyer.full_name,
    };

    const resoldEvent: TimelineEvent = {
      event_id: `ev-resold-${Date.now()}`,
      event_type: 'RESOLD',
      from_status: 'SOLD',
      to_status: 'SOLD',
      actor: {
        user_id: null,
        display: 'Verified Handshake',
        role: 'CONSUMER',
      },
      notes: `Ownership transferred to ${buyer.full_name}`,
      created_at: new Date().toISOString(),
      event_hash: Math.random().toString(16).substring(2, 18),
    };

    twin.timeline.push(resoldEvent);

    return [
      200,
      {
        success: true,
        data: {
          twin,
          transferred_at: transfer.claimed_at,
          event: resoldEvent,
        },
      },
    ];
  });

  // ------------------------------------------
  // 5. Dual-Mode Scanning Endpoints (§7.5)
  // ------------------------------------------

  function evaluateScan(twin: TwinView | null, caller: User, method: 'WATERMARK' | 'QR'): ScanResponseData {
    // Check Dev Scenario overrides
    if (devSettings.scanScenario === 'FAKE' || !twin) {
      return {
        scan_id: `scan-${Date.now()}`,
        verdict: 'FAKE',
        verification_method: method,
        confidence: method === 'WATERMARK' ? 0.94 : 1.0,
        is_owner: false,
        role_view: 'NONE',
        allowed_actions: [],
        twin: null,
        reason: 'TWIN_NOT_FOUND',
        message: 'No matching Digital Twin found. This product may be counterfeit.',
      };
    }

    if (devSettings.scanScenario === 'ALREADY_CLAIMED') {
      return {
        scan_id: `scan-${Date.now()}`,
        verdict: 'ALREADY_CLAIMED',
        verification_method: method,
        confidence: 0.92,
        is_owner: false,
        role_view: 'LIMITED',
        allowed_actions: [],
        twin: {
          serial_number: twin.serial_number,
          status: 'SOLD',
          claimed_at: twin.claimed_at || '2026-11-15T16:45:00.000Z',
          product: {
            name: twin.product.name,
            brand: twin.product.brand,
            sku: twin.product.sku,
          },
        },
        message:
          'This item is already claimed and locked. If you are buying it second-hand, ask the owner to start an in-app transfer.',
      };
    }

    // Real state machine evaluation (§5.4)
    if (twin.status === 'SOLD') {
      const isOwner = twin.owner?.user_id === caller.user_id;

      if (caller.role === 'MANUFACTURER') {
        return {
          scan_id: `scan-${Date.now()}`,
          verdict: 'GENUINE',
          verification_method: method,
          confidence: method === 'WATERMARK' ? 0.96 : 1.0,
          is_owner: false,
          role_view: 'FULL',
          allowed_actions: ['APPEND_EVENT'],
          twin,
          message: 'Authentic product verified with full manufacturer access.',
        };
      }

      if (isOwner) {
        return {
          scan_id: `scan-${Date.now()}`,
          verdict: 'GENUINE',
          verification_method: method,
          confidence: method === 'WATERMARK' ? 0.96 : 1.0,
          is_owner: true,
          role_view: 'FULL',
          allowed_actions: ['INITIATE_TRANSFER'],
          twin,
          message: 'Authentic product verified. You are the registered owner.',
        };
      }

      // Not owner -> ALREADY_CLAIMED
      return {
        scan_id: `scan-${Date.now()}`,
        verdict: 'ALREADY_CLAIMED',
        verification_method: method,
        confidence: method === 'WATERMARK' ? 0.93 : 1.0,
        is_owner: false,
        role_view: 'LIMITED',
        allowed_actions: [],
        twin: {
          serial_number: twin.serial_number,
          status: 'SOLD',
          claimed_at: twin.claimed_at || '2026-11-15T16:45:00.000Z',
          product: {
            name: twin.product.name,
            brand: twin.product.brand,
            sku: twin.product.sku,
          },
        },
        message:
          'This item is already claimed and locked. If you are buying it second-hand, ask the owner to start an in-app transfer.',
      };
    }

    // Status is not SOLD -> GENUINE
    const actions: AllowedAction[] = [];
    if (caller.role === 'MANUFACTURER') {
      actions.push('APPEND_EVENT');
    } else if (caller.role === 'RETAILER') {
      if (twin.status === 'IN_TRANSIT') {
        actions.push('RECEIVE');
      } else if (twin.status === 'IN_RETAIL') {
        actions.push('INSPECT', 'SELL');
      }
    }

    return {
      scan_id: `scan-${Date.now()}`,
      verdict: 'GENUINE',
      verification_method: method,
      confidence: method === 'WATERMARK' ? 0.95 : 1.0,
      is_owner: false,
      role_view: 'FULL',
      allowed_actions: actions,
      twin,
      message: 'Authentic product verified. Hash chain and physical markers matched.',
    };
  }

  // POST /products/scan-logo
  mock.onPost(/\/products\/scan-logo$/).reply((config) => {
    const caller = getCurrentUser(config);

    if (devSettings.scanScenario === 'SERVICE_DOWN') {
      return [
        503,
        {
          success: false,
          error: {
            code: 'IMAGE_SERVICE_UNAVAILABLE',
            message: 'Logo watermark scanning service is currently unavailable. Please use QR scan.',
          },
        },
      ];
    }

    if (devSettings.scanScenario === 'LOW_CONFIDENCE') {
      return [
        422,
        {
          success: false,
          error: {
            code: 'WATERMARK_LOW_CONFIDENCE',
            message: "We couldn't read the hidden logo mark reliably. Try better lighting or scan the QR code instead.",
            details: {
              confidence: 0.41,
              threshold: 0.75,
              fallback_required: true,
              suggested_action: 'SWITCH_TO_QR',
              scan_id: `scan-${Date.now()}`,
            },
          },
        },
      ];
    }

    // Default: Return scan on Twin 1 (In Retail) or Twin 2 (Sold) depending on context
    const twin = mockTwins[0];
    const result = evaluateScan(twin, caller, 'WATERMARK');
    return [200, { success: true, data: result }];
  });

  // POST /products/scan-qr
  mock.onPost(/\/products\/scan-qr$/).reply((config) => {
    const caller = getCurrentUser(config);
    const { qr_payload } = JSON.parse(config.data || '{}');

    if (!qr_payload || !qr_payload.startsWith('VT1.')) {
      if (qr_payload?.startsWith('VTX1.')) {
        return [
          422,
          {
            success: false,
            error: {
              code: 'INVALID_QR_FORMAT',
              message: "That's a transfer QR — please use 'Scan Transfer'.",
              details: { hint: 'TRANSFER_QR' },
            },
          },
        ];
      }
      return [
        422,
        {
          success: false,
          error: {
            code: 'INVALID_QR_FORMAT',
            message: 'Scanned barcode is not a valid VeriTwin QR code.',
          },
        },
      ];
    }

    // Parse payload: VT1.<twinIdB64>.<sig>
    const parts = qr_payload.split('.');
    let twinId = '';
    try {
      twinId = typeof atob !== 'undefined' ? atob(parts[1]) : Buffer.from(parts[1], 'base64').toString();
    } catch {
      twinId = parts[1];
    }

    const twin = mockTwins.find((t) => t.twin_id === twinId) || mockTwins[0];
    const result = evaluateScan(twin, caller, 'QR');
    return [200, { success: true, data: result }];
  });

  // GET /products/twins/:twinId (Refresh twin after scan)
  mock.onGet(/\/products\/twins\/[^/?]+$/).reply((config) => {
    const caller = getCurrentUser(config);
    const parts = (config.url || '').split('/');
    const twinId = parts[parts.length - 1];
    const twin = mockTwins.find((t) => t.twin_id === twinId) || mockTwins[0];

    const result = evaluateScan(twin, caller, 'QR');
    return [
      200,
      {
        success: true,
        data: {
          twin: result.twin,
          role_view: result.role_view,
          allowed_actions: result.allowed_actions,
        },
      },
    ];
  });
}

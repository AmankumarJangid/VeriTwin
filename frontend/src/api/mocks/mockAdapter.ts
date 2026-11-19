// Stateful Mock Adapter using axios-mock-adapter
// Mirrors 00_SHARED_CONTRACT.md 100%
import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';
import {
  SEED_USERS,
  SEED_PRODUCTS,
  SEED_BATCHES,
  SEED_TWINS,
  SEED_ANALYTICS,
} from './mockData';
import {
  User,
  Product,
  Batch,
  TwinView,
  TimelineEvent,
  AllowedAction,
  RetailerSaleItem,
} from '../../types/api';
import { useAuthStore } from '../../store/authStore';

// In-memory state
let products: Product[] = [...SEED_PRODUCTS];
let batches: Batch[] = [...SEED_BATCHES];
let twins: TwinView[] = JSON.parse(JSON.stringify(SEED_TWINS));
let sales: RetailerSaleItem[] = [
  {
    twin_id: 't3333333-3333-4333-8333-333333333333',
    serial_number: 'VT-WCH-2026-000125',
    product_name: 'Chrono Classic 42',
    consumer_name: 'Riya Sharma',
    sale_price: 24999.0,
    invoice_no: 'INV-2026-8821',
    sold_at: '2026-11-15T12:00:00.000Z',
  },
];

let activeTransfers: Record<
  string,
  {
    transfer_id: string;
    twin_id: string;
    qr_payload: string;
    status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
    expires_at: string;
    created_at: number;
    seller_id: string;
  }
> = {};

export function setupMockAdapter(client: AxiosInstance) {
  const mock = new MockAdapter(client, { delayResponse: 200 });

  // 1. Health
  mock.onGet('/health').reply(200, {
    success: true,
    data: {
      api: 'ok',
      db: 'ok',
      image_service: 'ok',
      time: new Date().toISOString(),
    },
  });

  // 2. Auth: Login
  mock.onPost('/auth/login').reply((config) => {
    const { email, password } = JSON.parse(config.data || '{}');
    const matched = Object.values(SEED_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!matched) {
      return [
        401,
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Invalid email or password',
          },
        },
      ];
    }

    return [
      200,
      {
        success: true,
        data: {
          user: matched,
          tokens: {
            access_token: `mock_jwt_access_${matched.user_id}`,
            refresh_token: `mock_jwt_refresh_${matched.user_id}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // 3. Auth: Register
  mock.onPost('/auth/register').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const role = body.role || 'CONSUMER';
    const newUser: User = {
      user_id: `user-${Date.now()}`,
      full_name: body.full_name || 'New User',
      email: body.email,
      role: role,
      organization_name: body.organization_name || null,
      created_at: new Date().toISOString(),
    };

    return [
      201,
      {
        success: true,
        data: {
          user: newUser,
          tokens: {
            access_token: `mock_jwt_access_${newUser.user_id}`,
            refresh_token: `mock_jwt_refresh_${newUser.user_id}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // 4. Auth: Refresh
  mock.onPost('/auth/refresh').reply((config) => {
    return [
      200,
      {
        success: true,
        data: {
          tokens: {
            access_token: `mock_refreshed_access_${Date.now()}`,
            refresh_token: `mock_refreshed_refresh_${Date.now()}`,
            expires_in: 900,
          },
        },
      },
    ];
  });

  // 5. Auth: Logout
  mock.onPost('/auth/logout').reply(200, {
    success: true,
    data: { logged_out: true },
  });

  // 6. Auth: Me
  mock.onGet('/auth/me').reply(() => {
    const currentUser = useAuthStore.getState().user || SEED_USERS.maker;
    return [
      200,
      {
        success: true,
        data: { user: currentUser },
      },
    ];
  });

  // 7. Manufacturer: Analytics Overview
  mock.onGet(/\/manufacturer\/analytics\/overview.*/).reply(200, {
    success: true,
    data: SEED_ANALYTICS,
  });

  // 8. Manufacturer: Products
  mock.onGet('/manufacturer/products').reply((config) => {
    const q = config.params?.q?.toLowerCase();
    const category = config.params?.category;

    let filtered = [...products];
    if (q) {
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    return [
      200,
      {
        success: true,
        data: { products: filtered },
        meta: { page: 1, limit: 20, total: filtered.length, total_pages: 1 },
      },
    ];
  });

  mock.onGet(/\/manufacturer\/products\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const product = products.find((p) => p.product_id === id) || products[0];
    return [
      200,
      {
        success: true,
        data: {
          product,
          stats: { twins_total: 24, sold: 6, in_retail: 10 },
        },
      },
    ];
  });

  mock.onPost('/manufacturer/products').reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newProduct: Product = {
      product_id: `prod-${Date.now()}`,
      sku: data.sku || `SKU-${Date.now()}`,
      name: data.name,
      brand: data.brand || 'Aurelia',
      category: data.category || 'WATCH',
      mrp: Number(data.mrp) || 19999,
      currency: 'INR',
      material: data.material || 'Stainless Steel',
      specs: data.specs || {},
      description: data.description || '',
      created_at: new Date().toISOString(),
    };
    products.unshift(newProduct);
    return [201, { success: true, data: { product: newProduct } }];
  });

  mock.onPatch(/\/manufacturer\/products\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const patch = JSON.parse(config.data || '{}');
    const idx = products.findIndex((p) => p.product_id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...patch };
      return [200, { success: true, data: { product: products[idx] } }];
    }
    return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
  });

  // 9. Manufacturer: Batches
  mock.onGet(/\/manufacturer\/batches.*/).reply(200, {
    success: true,
    data: { batches },
    meta: { page: 1, limit: 20, total: batches.length, total_pages: 1 },
  });

  mock.onPost('/manufacturer/batches').reply((config) => {
    const data = JSON.parse(config.data || '{}');
    const newBatch: Batch = {
      batch_id: `batch-${Date.now()}`,
      batch_no: data.batch_no || `B-${Date.now()}`,
      product_id: data.product_id,
      planned_quantity: data.planned_quantity || 50,
      manufactured_on: data.manufactured_on || new Date().toISOString().split('T')[0],
      factory_location: data.factory_location || 'Jodhpur Atelier, IN',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      twins_count: 0,
    };
    batches.unshift(newBatch);
    return [201, { success: true, data: { batch: newBatch } }];
  });

  // 10. Manufacturer: Create Twins
  mock.onPost('/manufacturer/twins').reply((config) => {
    const quantity = 2;
    const created = [];
    const prod = products[0];
    const bat = batches[0];

    for (let i = 1; i <= quantity; i++) {
      const serial = `VT-WCH-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const twinId = `twin-${Date.now()}-${i}`;
      const code = Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase();

      const newTwin: TwinView = {
        twin_id: twinId,
        serial_number: serial,
        twin_code: code,
        status: 'MANUFACTURED',
        product: prod,
        batch: bat,
        current_retailer: null,
        owner: null,
        claimed_at: null,
        timeline: [
          {
            event_id: `ev-new-${Date.now()}-${i}`,
            event_type: 'MANUFACTURED',
            from_status: null,
            to_status: 'MANUFACTURED',
            actor: {
              user_id: SEED_USERS.maker.user_id,
              display: 'Aurelia Watches',
              role: 'MANUFACTURER',
            },
            notes: 'Digital twin generated with watermark & fallback QR.',
            created_at: new Date().toISOString(),
            event_hash: 'genesis_' + code.toLowerCase(),
          },
        ],
      };

      twins.unshift(newTwin);
      created.push({
        twin_id: twinId,
        serial_number: serial,
        twin_code: code,
        status: 'MANUFACTURED' as const,
        watermarked_logo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop',
        fallback_qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=VT1.' + twinId,
        fallback_qr_payload: `VT1.${twinId}.mock_signature_hmac`,
        created_at: new Date().toISOString(),
      });
    }

    return [
      201,
      {
        success: true,
        data: {
          count: created.length,
          twins: created,
        },
      },
    ];
  });

  // 11. Manufacturer: Twins List & Detail
  mock.onGet(/\/manufacturer\/twins\/[^/]+\/integrity$/).reply(200, {
    success: true,
    data: {
      valid: true,
      events_checked: 4,
      broken_at_event_id: null,
    },
  });

  mock.onGet(/\/manufacturer\/twins\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const twin = twins.find((t) => t.twin_id === id) || twins[0];
    return [
      200,
      {
        success: true,
        data: {
          twin,
          assets: {
            watermarked_logo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop',
            fallback_qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=VT1.' + twin.twin_id,
            fallback_qr_payload: `VT1.${twin.twin_id}.mock_signature_hmac`,
          },
        },
      },
    ];
  });

  mock.onGet(/\/manufacturer\/twins.*/).reply((config) => {
    const list = twins.map((t) => ({
      twin_id: t.twin_id,
      serial_number: t.serial_number,
      status: t.status,
      product: { name: t.product.name, sku: t.product.sku },
      batch_no: t.batch.batch_no,
      current_retailer_name: t.current_retailer?.organization_name || null,
      owner_name: t.owner?.full_name || null,
      created_at: t.timeline[0]?.created_at || new Date().toISOString(),
    }));

    return [
      200,
      {
        success: true,
        data: { twins: list },
        meta: { page: 1, limit: 20, total: list.length, total_pages: 1 },
      },
    ];
  });

  // 12. Manufacturer: Append Event
  mock.onPost(/\/manufacturer\/twins\/[^/]+\/events$/).reply((config) => {
    const parts = config.url?.split('/') || [];
    const twinId = parts[parts.length - 2];
    const { event_type, notes, metadata } = JSON.parse(config.data || '{}');

    const twin = twins.find((t) => t.twin_id === twinId);
    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found' } }];
    }

    const newStatus = event_type === 'QA_PASSED' ? 'QA_PASSED' : 'IN_TRANSIT';
    if (event_type === 'DISPATCHED_TO_RETAIL') {
      twin.current_retailer = {
        user_id: metadata?.retailer_id || SEED_USERS.retailer.user_id,
        organization_name: 'TimeHouse Retail',
      };
    }

    const event: TimelineEvent = {
      event_id: `ev-${Date.now()}`,
      event_type,
      from_status: twin.status,
      to_status: newStatus,
      actor: {
        user_id: SEED_USERS.maker.user_id,
        display: 'Aurelia Watches',
        role: 'MANUFACTURER',
      },
      notes: notes || '',
      metadata,
      created_at: new Date().toISOString(),
      event_hash: `hash_${Date.now()}`,
    };

    twin.status = newStatus;
    twin.timeline.push(event);

    return [
      201,
      {
        success: true,
        data: {
          event,
          twin_status: newStatus,
        },
      },
    ];
  });

  // 13. Manufacturer: Bulk Batch Events
  mock.onPost(/\/manufacturer\/batches\/[^/]+\/events$/).reply((config) => {
    const { event_type } = JSON.parse(config.data || '{}');
    return [
      200,
      {
        success: true,
        data: {
          updated: 5,
          skipped: [],
        },
      },
    ];
  });

  // 14. Manufacturer: Retailers list
  mock.onGet('/manufacturer/retailers').reply(200, {
    success: true,
    data: {
      retailers: [
        {
          user_id: SEED_USERS.retailer.user_id,
          organization_name: 'TimeHouse Retail',
          email: 'retail@veritwin.dev',
        },
      ],
    },
  });

  // 15. Manufacturer: Audit Feed
  mock.onGet(/\/manufacturer\/audit.*/).reply(() => {
    const allEvents: any[] = [];
    twins.forEach((t) => {
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

  // 16. Retailer: Inventory
  mock.onGet(/\/retailer\/inventory.*/).reply((config) => {
    const status = config.params?.status;
    let filtered = twins.filter(
      (t) => t.status === 'IN_TRANSIT' || t.status === 'IN_RETAIL'
    );

    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }

    const items = filtered.map((t) => ({
      twin_id: t.twin_id,
      serial_number: t.serial_number,
      status: t.status,
      product: {
        name: t.product.name,
        sku: t.product.sku,
        mrp: t.product.mrp,
      },
      dispatched_at: t.timeline.find((e) => e.event_type === 'DISPATCHED_TO_RETAIL')?.created_at || null,
      received_at: t.timeline.find((e) => e.event_type === 'RECEIVED_AT_RETAIL')?.created_at || null,
    }));

    const transitCount = twins.filter((t) => t.status === 'IN_TRANSIT').length;
    const retailCount = twins.filter((t) => t.status === 'IN_RETAIL').length;

    return [
      200,
      {
        success: true,
        data: {
          twins: items,
          counts: {
            IN_TRANSIT: transitCount,
            IN_RETAIL: retailCount,
          },
        },
        meta: { page: 1, limit: 20, total: items.length, total_pages: 1 },
      },
    ];
  });

  // 17. Retailer: Receive / Inspect Events
  mock.onPost(/\/retailer\/twins\/[^/]+\/events$/).reply((config) => {
    const parts = config.url?.split('/') || [];
    const twinId = parts[parts.length - 2];
    const { event_type, notes, metadata } = JSON.parse(config.data || '{}');

    const twin = twins.find((t) => t.twin_id === twinId);
    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found' } }];
    }

    const newStatus = event_type === 'RECEIVED_AT_RETAIL' ? 'IN_RETAIL' : twin.status;

    const event: TimelineEvent = {
      event_id: `ev-ret-${Date.now()}`,
      event_type,
      from_status: twin.status,
      to_status: newStatus,
      actor: {
        user_id: SEED_USERS.retailer.user_id,
        display: 'TimeHouse Retail',
        role: 'RETAILER',
      },
      notes: notes || '',
      metadata,
      created_at: new Date().toISOString(),
      event_hash: `hash_${Date.now()}`,
    };

    twin.status = newStatus;
    twin.timeline.push(event);

    return [
      201,
      {
        success: true,
        data: {
          event,
          twin_status: newStatus,
        },
      },
    ];
  });

  // 18. Retailer: Consumer Lookup
  mock.onGet(/\/retailer\/consumers\/lookup.*/).reply((config) => {
    const email = config.params?.email?.toLowerCase();
    const consumer = Object.values(SEED_USERS).find(
      (u) => u.role === 'CONSUMER' && u.email.toLowerCase() === email
    );

    if (!consumer) {
      return [
        404,
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No consumer found with that email' },
        },
      ];
    }

    return [
      200,
      {
        success: true,
        data: {
          consumer: {
            user_id: consumer.user_id,
            full_name: consumer.full_name,
            email_masked: `${consumer.email[0]}***@${consumer.email.split('@')[1]}`,
          },
        },
      },
    ];
  });

  // 19. Retailer: Sell Twin
  mock.onPost(/\/retailer\/twins\/[^/]+\/sell$/).reply((config) => {
    const parts = config.url?.split('/') || [];
    const twinId = parts[parts.length - 2];
    const { consumer_id, sale_price, invoice_no, notes } = JSON.parse(config.data || '{}');

    const twin = twins.find((t) => t.twin_id === twinId);
    if (!twin) {
      return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Twin not found' } }];
    }

    const buyer = Object.values(SEED_USERS).find((u) => u.user_id === consumer_id) || SEED_USERS.riya;

    twin.status = 'SOLD';
    twin.owner = {
      user_id: buyer.user_id,
      full_name: buyer.full_name,
    };
    twin.claimed_at = new Date().toISOString();

    const saleEvent: TimelineEvent = {
      event_id: `ev-sale-${Date.now()}`,
      event_type: 'FIRST_SALE',
      from_status: 'IN_RETAIL',
      to_status: 'SOLD',
      actor: {
        user_id: SEED_USERS.retailer.user_id,
        display: 'TimeHouse Retail',
        role: 'RETAILER',
      },
      notes: notes || `Invoice ${invoice_no}`,
      metadata: { invoice_no, sale_price },
      created_at: new Date().toISOString(),
      event_hash: `hash_sale_${Date.now()}`,
    };
    twin.timeline.push(saleEvent);

    sales.unshift({
      twin_id: twin.twin_id,
      serial_number: twin.serial_number,
      product_name: twin.product.name,
      consumer_name: buyer.full_name,
      sale_price: sale_price || twin.product.mrp,
      invoice_no: invoice_no || `INV-${Date.now()}`,
      sold_at: new Date().toISOString(),
    });

    return [
      200,
      {
        success: true,
        data: {
          twin_id: twin.twin_id,
          status: 'SOLD',
          owner: { user_id: buyer.user_id, full_name: buyer.full_name },
          event: saleEvent,
        },
      },
    ];
  });

  // 20. Retailer: Sales History
  mock.onGet(/\/retailer\/sales.*/).reply(200, {
    success: true,
    data: { sales },
    meta: { page: 1, limit: 20, total: sales.length, total_pages: 1 },
  });

  // 21. Consumer: Vault
  mock.onGet(/\/consumer\/vault.*/).reply(() => {
    const currentUser = useAuthStore.getState().user || SEED_USERS.riya;
    const owned = twins.filter((t) => t.owner?.user_id === currentUser.user_id);

    const items = owned.map((t) => ({
      twin_id: t.twin_id,
      serial_number: t.serial_number,
      product: {
        name: t.product.name,
        brand: t.product.brand,
        mrp: t.product.mrp,
      },
      acquired_at: t.claimed_at || t.timeline[t.timeline.length - 1]?.created_at || new Date().toISOString(),
      acquired_via: 'FIRST_SALE' as const,
      has_active_transfer: Object.values(activeTransfers).some(
        (tr) => tr.twin_id === t.twin_id && tr.status === 'PENDING'
      ),
    }));

    return [
      200,
      {
        success: true,
        data: { items },
        meta: { page: 1, limit: 20, total: items.length, total_pages: 1 },
      },
    ];
  });

  mock.onGet(/\/consumer\/vault\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const twin = twins.find((t) => t.twin_id === id) || twins[2];
    return [
      200,
      {
        success: true,
        data: { twin },
      },
    ];
  });

  // 22. Consumer: P2P Transfers
  mock.onPost('/consumer/transfers').reply((config) => {
    const { twin_id } = JSON.parse(config.data || '{}');
    const transferId = `tr-${Date.now()}`;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const payload = `VTX1.${token}`;
    const expires = new Date(Date.now() + 120000).toISOString();
    const currentUser = useAuthStore.getState().user || SEED_USERS.riya;

    activeTransfers[transferId] = {
      transfer_id: transferId,
      twin_id,
      qr_payload: payload,
      status: 'PENDING',
      expires_at: expires,
      created_at: Date.now(),
      seller_id: currentUser.user_id,
    };

    return [
      201,
      {
        success: true,
        data: {
          transfer_id: transferId,
          twin_id,
          qr_payload: payload,
          status: 'PENDING',
          ttl_seconds: 120,
          expires_at: expires,
        },
      },
    ];
  });

  mock.onGet(/\/consumer\/transfers\/[^/]+$/).reply((config) => {
    const transferId = config.url?.split('/').pop() || '';
    const transfer = activeTransfers[transferId];

    if (!transfer) {
      return [404, { success: false, error: { code: 'TRANSFER_INVALID', message: 'Unknown transfer token' } }];
    }

    const devMenu = useAuthStore.getState().devMenu;
    const elapsedSec = (Date.now() - transfer.created_at) / 1000;

    if (devMenu.transferBehavior === 'CLAIMED_AFTER_5S' && elapsedSec >= 5 && transfer.status === 'PENDING') {
      transfer.status = 'CLAIMED';
      const twin = twins.find((t) => t.twin_id === transfer.twin_id);
      if (twin) {
        twin.owner = {
          user_id: SEED_USERS.arjun.user_id,
          full_name: 'Arjun Mehta',
        };
        twin.claimed_at = new Date().toISOString();
        twin.timeline.push({
          event_id: `ev-resold-${Date.now()}`,
          event_type: 'RESOLD',
          from_status: 'SOLD',
          to_status: 'SOLD',
          actor: {
            user_id: null,
            display: 'P2P Transfer Handshake',
            role: 'CONSUMER',
          },
          notes: 'Transferred via single-use encrypted P2P QR handshake.',
          created_at: new Date().toISOString(),
          event_hash: `hash_resold_${Date.now()}`,
        });
      }
    } else if (devMenu.transferBehavior === 'EXPIRES' && elapsedSec >= 4) {
      transfer.status = 'EXPIRES' as any;
    }

    return [
      200,
      {
        success: true,
        data: {
          transfer_id: transfer.transfer_id,
          status: transfer.status,
          expires_at: transfer.expires_at,
          claimed_at: transfer.status === 'CLAIMED' ? new Date().toISOString() : null,
        },
      },
    ];
  });

  mock.onDelete(/\/consumer\/transfers\/[^/]+$/).reply((config) => {
    const transferId = config.url?.split('/').pop() || '';
    if (activeTransfers[transferId]) {
      activeTransfers[transferId].status = 'CANCELLED';
    }
    return [
      200,
      {
        success: true,
        data: {
          transfer_id: transferId,
          status: 'CANCELLED',
        },
      },
    ];
  });

  mock.onPost('/consumer/transfers/claim').reply((config) => {
    const { qr_payload } = JSON.parse(config.data || '{}');
    if (!qr_payload || !qr_payload.startsWith('VTX1.')) {
      return [
        422,
        {
          success: false,
          error: {
            code: 'INVALID_QR_FORMAT',
            message: 'That payload is not a valid VeriTwin transfer QR.',
          },
        },
      ];
    }

    const transferEntry = Object.values(activeTransfers).find(
      (t) => t.qr_payload === qr_payload
    );

    const currentUser = useAuthStore.getState().user || SEED_USERS.arjun;
    if (transferEntry && transferEntry.seller_id === currentUser.user_id) {
      return [
        400,
        {
          success: false,
          error: {
            code: 'CANNOT_CLAIM_OWN',
            message: "You can't claim your own item.",
          },
        },
      ];
    }

    const targetTwin = transferEntry ? twins.find((t) => t.twin_id === transferEntry.twin_id) : twins[2];
    if (targetTwin) {
      targetTwin.owner = {
        user_id: currentUser.user_id,
        full_name: currentUser.full_name,
      };
      targetTwin.claimed_at = new Date().toISOString();
      const resoldEvent: TimelineEvent = {
        event_id: `ev-resold-${Date.now()}`,
        event_type: 'RESOLD',
        from_status: 'SOLD',
        to_status: 'SOLD',
        actor: {
          user_id: null,
          display: 'P2P Transfer Handshake',
          role: 'CONSUMER',
        },
        notes: 'Transferred to ' + currentUser.full_name,
        created_at: new Date().toISOString(),
        event_hash: `hash_resold_${Date.now()}`,
      };
      targetTwin.timeline.push(resoldEvent);

      if (transferEntry) {
        transferEntry.status = 'CLAIMED';
      }

      return [
        200,
        {
          success: true,
          data: {
            twin: targetTwin,
            transferred_at: new Date().toISOString(),
            event: resoldEvent,
          },
        },
      ];
    }

    return [
      404,
      {
        success: false,
        error: {
          code: 'TRANSFER_INVALID',
          message: 'Transfer token is invalid or does not exist.',
        },
      },
    ];
  });

  // 23. Scanner: Scan Logo & Scan QR
  const handleScanEvaluation = (method: 'WATERMARK' | 'QR'): [number, any] => {
    const devMenu = useAuthStore.getState().devMenu;
    const currentUser = useAuthStore.getState().user;

    if (devMenu.scanOutcome === 'LOW_CONFIDENCE' && method === 'WATERMARK') {
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

    if (devMenu.scanOutcome === 'SERVICE_DOWN' && method === 'WATERMARK') {
      return [
        503,
        {
          success: false,
          error: {
            code: 'IMAGE_SERVICE_UNAVAILABLE',
            message: 'Image processing service is temporarily offline. Please use QR scan.',
          },
        },
      ];
    }

    if (devMenu.scanOutcome === 'FAKE') {
      return [
        200,
        {
          success: true,
          data: {
            scan_id: `scan-${Date.now()}`,
            verdict: 'FAKE',
            verification_method: method,
            confidence: method === 'QR' ? 1.0 : 0.93,
            is_owner: false,
            role_view: 'NONE',
            allowed_actions: [],
            twin: null,
            reason: method === 'QR' ? 'INVALID_SIGNATURE' : 'TWIN_NOT_FOUND',
            message: 'No matching Digital Twin exists. This product may be counterfeit.',
          },
        },
      ];
    }

    if (devMenu.scanOutcome === 'ALREADY_CLAIMED') {
      const soldTwin = twins.find((t) => t.status === 'SOLD') || twins[2];
      return [
        200,
        {
          success: true,
          data: {
            scan_id: `scan-${Date.now()}`,
            verdict: 'ALREADY_CLAIMED',
            verification_method: method,
            confidence: method === 'QR' ? 1.0 : 0.92,
            is_owner: false,
            role_view: 'LIMITED',
            allowed_actions: [],
            twin: {
              serial_number: soldTwin.serial_number,
              status: 'SOLD',
              claimed_at: soldTwin.claimed_at || '2026-11-15T12:00:00.000Z',
              product: {
                name: soldTwin.product.name,
                brand: soldTwin.product.brand,
                sku: soldTwin.product.sku,
              },
            },
            message: 'This item is already claimed and locked. If you are buying it second-hand, ask the owner to start an in-app transfer.',
          },
        },
      ];
    }

    // Default: GENUINE
    const sampleTwin = twins.find((t) => t.status === 'IN_RETAIL') || twins[0];
    const userRole = currentUser?.role || 'CONSUMER';
    let allowed: AllowedAction[] = [];

    if (userRole === 'MANUFACTURER') {
      allowed = ['APPEND_EVENT'];
    } else if (userRole === 'RETAILER') {
      if (sampleTwin.status === 'IN_TRANSIT') allowed = ['RECEIVE'];
      if (sampleTwin.status === 'IN_RETAIL') allowed = ['INSPECT', 'SELL'];
    } else if (userRole === 'CONSUMER') {
      if (sampleTwin.owner?.user_id === currentUser?.user_id) {
        allowed = ['INITIATE_TRANSFER'];
      }
    }

    return [
      200,
      {
        success: true,
        data: {
          scan_id: `scan-${Date.now()}`,
          verdict: 'GENUINE',
          verification_method: method,
          confidence: method === 'QR' ? 1.0 : 0.95,
          is_owner: sampleTwin.owner?.user_id === currentUser?.user_id,
          role_view: 'FULL',
          allowed_actions: allowed,
          twin: sampleTwin,
          message: 'Authentic product verified with tamper-evident cryptographic signature.',
        },
      },
    ];
  };

  mock.onPost('/products/scan-logo').reply(() => handleScanEvaluation('WATERMARK'));

  mock.onPost('/products/scan-qr').reply((config) => {
    const { qr_payload } = JSON.parse(config.data || '{}');
    if (!qr_payload || !qr_payload.startsWith('VT1.')) {
      if (qr_payload && qr_payload.startsWith('VTX1.')) {
        return [
          422,
          {
            success: false,
            error: {
              code: 'INVALID_QR_FORMAT',
              message: "That's a transfer QR — use the 'Scan Transfer' tab to claim ownership.",
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
            message: 'That is not a valid VeriTwin product QR code.',
          },
        },
      ];
    }

    return handleScanEvaluation('QR');
  });

  mock.onGet(/\/products\/twins\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const twin = twins.find((t) => t.twin_id === id) || twins[0];
    return [
      200,
      {
        success: true,
        data: {
          twin,
          role_view: 'FULL',
          allowed_actions: ['INSPECT', 'SELL'],
        },
      },
    ];
  });

  console.log('[MockAdapter] Installed successfully with 34 mock route handlers.');
}

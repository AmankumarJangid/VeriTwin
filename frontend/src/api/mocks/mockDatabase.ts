import {
  User,
  Product,
  Batch,
  TwinView,
  TimelineEvent,
  ScanVerdict,
  TransferStatus,
  RetailerSaleHistoryItem,
} from '../../types/api';

export interface DevSettings {
  scanScenario: 'AUTO' | 'GENUINE' | 'ALREADY_CLAIMED' | 'FAKE' | 'LOW_CONFIDENCE' | 'SERVICE_DOWN';
  transferScenario: 'NORMAL' | 'CLAIMED_AFTER_5S' | 'EXPIRES' | 'ALREADY_USED';
  simulatedLatency: number; // ms
}

export const devSettings: DevSettings = {
  scanScenario: 'AUTO',
  transferScenario: 'NORMAL',
  simulatedLatency: 200,
};

// Seed Users (§8 of Contract)
export const mockUsers: User[] = [
  {
    user_id: 'usr-mfg-001',
    full_name: 'Aurelia Production Lead',
    email: 'maker@veritwin.dev',
    role: 'MANUFACTURER',
    organization_name: 'Aurelia Watches Ltd.',
    created_at: '2026-11-01T08:00:00.000Z',
  },
  {
    user_id: 'usr-ret-001',
    full_name: 'TimeHouse Retail Manager',
    email: 'retail@veritwin.dev',
    role: 'RETAILER',
    organization_name: 'TimeHouse Retail',
    created_at: '2026-11-02T09:30:00.000Z',
  },
  {
    user_id: 'usr-con-riya',
    full_name: 'Riya Sharma',
    email: 'riya@veritwin.dev',
    role: 'CONSUMER',
    organization_name: null,
    created_at: '2026-11-05T14:15:00.000Z',
  },
  {
    user_id: 'usr-con-arjun',
    full_name: 'Arjun Mehta',
    email: 'arjun@veritwin.dev',
    role: 'CONSUMER',
    organization_name: null,
    created_at: '2026-11-08T11:20:00.000Z',
  },
];

// Seed Products
export const mockProducts: Product[] = [
  {
    product_id: 'prod-wch-001',
    sku: 'WCH-CHR-001',
    name: 'Chrono Classic 42',
    brand: 'Aurelia',
    category: 'WATCH',
    mrp: 24999.0,
    currency: 'INR',
    material: '316L Stainless Steel, Double-domed Sapphire Glass',
    specs: {
      case_mm: 42,
      movement: 'Calibre 9015 Automatic',
      water_resistance_m: 100,
      dial_color: 'Midnight Sunburst',
      strap_width_mm: 20,
    },
    description: 'Precision engineered automatic chronograph with exhibition caseback.',
    created_at: '2026-11-10T10:00:00.000Z',
  },
  {
    product_id: 'prod-app-002',
    sku: 'APP-JKT-042',
    name: 'Heritage Silk Bomber',
    brand: 'Aurelia',
    category: 'APPAREL',
    mrp: 18500.0,
    currency: 'INR',
    material: '100% Mulberry Raw Silk, Cupro Lining',
    specs: {
      fit: 'Relaxed Tailored',
      care: 'Dry Clean Only',
      hardware: 'Hand-brushed Raccagni Zippers',
    },
    description: 'Handwoven raw silk statement jacket with custom internal security thread.',
    created_at: '2026-11-12T11:30:00.000Z',
  },
  {
    product_id: 'prod-ftw-003',
    sku: 'FTW-SPR-100',
    name: 'Aurelia Sprint 100 Runner',
    brand: 'Aurelia',
    category: 'FOOTWEAR',
    mrp: 12999.0,
    currency: 'INR',
    material: 'Full-grain Italian Calfskin, Vibram Sole',
    specs: {
      sole: 'Vibram Megagrip Compound',
      insole: 'Ortholite Hybrid Eco',
    },
    description: 'Luxury artisanal athletic shoe with embedded authenticity marker.',
    created_at: '2026-11-14T09:00:00.000Z',
  },
];

// Seed Batches
export const mockBatches: Batch[] = [
  {
    batch_id: 'batch-2026-11-a',
    batch_no: 'B-2026-11-A',
    product_id: 'prod-wch-001',
    planned_quantity: 100,
    manufactured_on: '2026-11-10',
    factory_location: 'Jodhpur Atelier, IN',
    notes: 'Inaugural production run with sapphire casebacks',
    created_at: '2026-11-10T10:30:00.000Z',
    twins_count: 3,
  },
  {
    batch_id: 'batch-2026-11-b',
    batch_no: 'B-2026-11-B',
    product_id: 'prod-app-002',
    planned_quantity: 50,
    manufactured_on: '2026-11-12',
    factory_location: 'Jaipur Heritage Loom, IN',
    notes: 'Mulberry silk limited edition run',
    created_at: '2026-11-12T12:00:00.000Z',
    twins_count: 1,
  },
];

// Helper to generate hash chains
function createHash(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + 'c9f4d1e2';
}

// Seed Digital Twins
export const mockTwins: TwinView[] = [
  // Twin 1: In Retail (Ready to be sold by retailer)
  {
    twin_id: 'twin-001-in-retail',
    serial_number: 'VT-WCH-2026-000101',
    twin_code: '9F3A27C1',
    status: 'IN_RETAIL',
    product: mockProducts[0],
    batch: {
      batch_id: 'batch-2026-11-a',
      batch_no: 'B-2026-11-A',
      manufactured_on: '2026-11-10',
      factory_location: 'Jodhpur Atelier, IN',
    },
    current_retailer: {
      user_id: 'usr-ret-001',
      organization_name: 'TimeHouse Retail',
    },
    owner: null,
    claimed_at: null,
    timeline: [
      {
        event_id: 'ev-01-mfg',
        event_type: 'MANUFACTURED',
        from_status: null,
        to_status: 'MANUFACTURED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Production Lead', role: 'MANUFACTURER' },
        notes: 'Twin genesis created with imperceptible watermark & signed QR',
        created_at: '2026-11-10T11:00:00.000Z',
        event_hash: createHash('ev-01-genesis'),
      },
      {
        event_id: 'ev-02-qa',
        event_type: 'QA_PASSED',
        from_status: 'MANUFACTURED',
        to_status: 'QA_PASSED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia QC Department', role: 'MANUFACTURER' },
        notes: 'Passed 10-bar hydrostatic pressure and chronometric accuracy tests',
        created_at: '2026-11-11T09:30:00.000Z',
        event_hash: createHash('ev-02-qa'),
      },
      {
        event_id: 'ev-03-disp',
        event_type: 'DISPATCHED_TO_RETAIL',
        from_status: 'QA_PASSED',
        to_status: 'IN_TRANSIT',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Logistics Hub', role: 'MANUFACTURER' },
        notes: 'Shipped under air manifest #AWB-90214 to TimeHouse Retail',
        metadata: { retailer_id: 'usr-ret-001' },
        created_at: '2026-11-12T14:00:00.000Z',
        event_hash: createHash('ev-03-disp'),
      },
      {
        event_id: 'ev-04-rec',
        event_type: 'RECEIVED_AT_RETAIL',
        from_status: 'IN_TRANSIT',
        to_status: 'IN_RETAIL',
        actor: { user_id: 'usr-ret-001', display: 'TimeHouse Retail', role: 'RETAILER' },
        notes: 'Security tamper seal verified intact. Stocked in Vault B.',
        metadata: { condition: 'OK' },
        created_at: '2026-11-14T10:15:00.000Z',
        event_hash: createHash('ev-04-rec'),
      },
    ],
  },

  // Twin 2: Sold to Riya (Owned in Consumer Vault, transferable)
  {
    twin_id: 'twin-002-sold-riya',
    serial_number: 'VT-WCH-2026-000102',
    twin_code: '4B8C19D7',
    status: 'SOLD',
    product: mockProducts[0],
    batch: {
      batch_id: 'batch-2026-11-a',
      batch_no: 'B-2026-11-A',
      manufactured_on: '2026-11-10',
      factory_location: 'Jodhpur Atelier, IN',
    },
    current_retailer: {
      user_id: 'usr-ret-001',
      organization_name: 'TimeHouse Retail',
    },
    owner: {
      user_id: 'usr-con-riya',
      full_name: 'Riya Sharma',
    },
    claimed_at: '2026-11-15T16:45:00.000Z',
    timeline: [
      {
        event_id: 'ev-11-mfg',
        event_type: 'MANUFACTURED',
        from_status: null,
        to_status: 'MANUFACTURED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Production Lead', role: 'MANUFACTURER' },
        notes: 'Twin genesis created',
        created_at: '2026-11-10T11:05:00.000Z',
        event_hash: createHash('ev-11-mfg'),
      },
      {
        event_id: 'ev-12-qa',
        event_type: 'QA_PASSED',
        from_status: 'MANUFACTURED',
        to_status: 'QA_PASSED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia QC Department', role: 'MANUFACTURER' },
        notes: 'QA passed',
        created_at: '2026-11-11T09:35:00.000Z',
        event_hash: createHash('ev-12-qa'),
      },
      {
        event_id: 'ev-13-disp',
        event_type: 'DISPATCHED_TO_RETAIL',
        from_status: 'QA_PASSED',
        to_status: 'IN_TRANSIT',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Logistics Hub', role: 'MANUFACTURER' },
        notes: 'Dispatched to TimeHouse Retail',
        metadata: { retailer_id: 'usr-ret-001' },
        created_at: '2026-11-12T14:10:00.000Z',
        event_hash: createHash('ev-13-disp'),
      },
      {
        event_id: 'ev-14-rec',
        event_type: 'RECEIVED_AT_RETAIL',
        from_status: 'IN_TRANSIT',
        to_status: 'IN_RETAIL',
        actor: { user_id: 'usr-ret-001', display: 'TimeHouse Retail', role: 'RETAILER' },
        notes: 'Received and registered at retail location',
        created_at: '2026-11-14T10:20:00.000Z',
        event_hash: createHash('ev-14-rec'),
      },
      {
        event_id: 'ev-15-sale',
        event_type: 'FIRST_SALE',
        from_status: 'IN_RETAIL',
        to_status: 'SOLD',
        actor: { user_id: 'usr-ret-001', display: 'TimeHouse Retail', role: 'RETAILER' },
        notes: 'Handover complete with luxury presentation box and 5-year international warranty.',
        metadata: { invoice_no: 'INV-2026-904', sale_price: 24999.0 },
        created_at: '2026-11-15T16:45:00.000Z',
        event_hash: createHash('ev-15-sale'),
      },
    ],
  },

  // Twin 3: In Transit to Retailer
  {
    twin_id: 'twin-003-in-transit',
    serial_number: 'VT-APP-2026-000201',
    twin_code: '7A1E39B2',
    status: 'IN_TRANSIT',
    product: mockProducts[1],
    batch: {
      batch_id: 'batch-2026-11-b',
      batch_no: 'B-2026-11-B',
      manufactured_on: '2026-11-12',
      factory_location: 'Jaipur Heritage Loom, IN',
    },
    current_retailer: {
      user_id: 'usr-ret-001',
      organization_name: 'TimeHouse Retail',
    },
    owner: null,
    claimed_at: null,
    timeline: [
      {
        event_id: 'ev-21-mfg',
        event_type: 'MANUFACTURED',
        from_status: null,
        to_status: 'MANUFACTURED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Production Lead', role: 'MANUFACTURER' },
        notes: 'Silk garment twin created with micro-woven security tag',
        created_at: '2026-11-12T12:30:00.000Z',
        event_hash: createHash('ev-21-mfg'),
      },
      {
        event_id: 'ev-22-qa',
        event_type: 'QA_PASSED',
        from_status: 'MANUFACTURED',
        to_status: 'QA_PASSED',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia QC Department', role: 'MANUFACTURER' },
        notes: 'Fabric integrity and seam tension verified',
        created_at: '2026-11-13T10:00:00.000Z',
        event_hash: createHash('ev-22-qa'),
      },
      {
        event_id: 'ev-23-disp',
        event_type: 'DISPATCHED_TO_RETAIL',
        from_status: 'QA_PASSED',
        to_status: 'IN_TRANSIT',
        actor: { user_id: 'usr-mfg-001', display: 'Aurelia Logistics Hub', role: 'MANUFACTURER' },
        notes: 'Dispatched via express secure courier to TimeHouse Retail',
        metadata: { retailer_id: 'usr-ret-001' },
        created_at: '2026-11-15T09:00:00.000Z',
        event_hash: createHash('ev-23-disp'),
      },
    ],
  },
];

// Retailer Sales History
export const mockRetailerSales: RetailerSaleHistoryItem[] = [
  {
    twin_id: 'twin-002-sold-riya',
    serial_number: 'VT-WCH-2026-000102',
    product_name: 'Chrono Classic 42',
    consumer_name: 'Riya Sharma',
    sale_price: 24999.0,
    invoice_no: 'INV-2026-904',
    sold_at: '2026-11-15T16:45:00.000Z',
  },
];

// Active P2P Transfers
export interface MockTransfer {
  transfer_id: string;
  twin_id: string;
  seller_id: string;
  qr_payload: string;
  status: TransferStatus;
  ttl_seconds: number;
  expires_at: string;
  claimed_at: string | null;
  created_at: number; // Date.now()
}

export const mockTransfers: MockTransfer[] = [];

// Helper to generate signed QR payloads
export function generateSignedQrPayload(twinId: string): string {
  const b64Id = typeof btoa !== 'undefined' ? btoa(twinId) : Buffer.from(twinId).toString('base64');
  return `VT1.${b64Id}.9be1a74d280f5c`;
}

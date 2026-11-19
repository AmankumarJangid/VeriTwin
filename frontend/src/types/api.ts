// VeriTwin - Shared Contract TypeScript Definitions
// 1:1 with 00_SHARED_CONTRACT.md

export type UserRole = 'MANUFACTURER' | 'RETAILER' | 'CONSUMER';

export type ProductCategory = 'WATCH' | 'APPAREL' | 'FOOTWEAR' | 'ACCESSORY' | 'OTHER';

export type TwinStatus = 'MANUFACTURED' | 'QA_PASSED' | 'IN_TRANSIT' | 'IN_RETAIL' | 'SOLD';

export type LifecycleEventType =
  | 'MANUFACTURED'
  | 'QA_PASSED'
  | 'DISPATCHED_TO_RETAIL'
  | 'RECEIVED_AT_RETAIL'
  | 'INSPECTED'
  | 'FIRST_SALE'
  | 'RESOLD';

export type VerificationMethod = 'WATERMARK' | 'QR';

export type ScanVerdict = 'GENUINE' | 'FAKE' | 'ALREADY_CLAIMED';

export type TransferStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export type AllowedAction =
  | 'APPEND_EVENT'
  | 'RECEIVE'
  | 'INSPECT'
  | 'SELL'
  | 'INITIATE_TRANSFER';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'CANNOT_CLAIM_OWN'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_ASSIGNED'
  | 'NOT_OWNER'
  | 'NOT_FOUND'
  | 'TRANSFER_INVALID'
  | 'CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'TRANSFER_ALREADY_USED'
  | 'TRANSFER_EXPIRED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'WATERMARK_LOW_CONFIDENCE'
  | 'INVALID_QR_FORMAT'
  | 'RATE_LIMITED'
  | 'IMAGE_SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  organization_name: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  mrp: number;
  currency: string;
  material: string;
  specs: Record<string, any>;
  description: string;
  created_at: string;
}

export interface Batch {
  batch_id: string;
  batch_no: string;
  product_id: string;
  planned_quantity: number;
  manufactured_on: string;
  factory_location: string;
  notes: string;
  created_at: string;
  twins_count?: number;
}

export interface TimelineActor {
  user_id: string | null;
  display: string;
  role: UserRole;
}

export interface TimelineEvent {
  event_id: string;
  event_type: LifecycleEventType;
  from_status: TwinStatus | null;
  to_status: TwinStatus;
  actor: TimelineActor;
  notes: string;
  metadata?: Record<string, any>;
  created_at: string;
  event_hash: string;
  twin_id?: string;
  serial_number?: string;
}

export interface TwinView {
  twin_id: string;
  serial_number: string;
  twin_code?: string;
  status: TwinStatus;
  product: Product;
  batch: Batch;
  current_retailer?: {
    user_id: string;
    organization_name: string;
  } | null;
  owner?: {
    user_id: string;
    full_name: string;
  } | null;
  claimed_at: string | null;
  timeline: TimelineEvent[];
}

export interface LimitedTwinView {
  serial_number: string;
  status: TwinStatus;
  claimed_at: string | null;
  product: {
    name: string;
    brand: string;
    sku: string;
  };
}

export interface CreatedTwin {
  twin_id: string;
  serial_number: string;
  twin_code: string;
  status: TwinStatus;
  watermarked_logo_url: string;
  fallback_qr_url: string;
  fallback_qr_payload: string;
  created_at: string;
}

export interface TwinListItem {
  twin_id: string;
  serial_number: string;
  status: TwinStatus;
  product: {
    name: string;
    sku: string;
  };
  batch_no: string;
  current_retailer_name: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface RetailerListItem {
  user_id: string;
  organization_name: string;
  email: string;
}

export interface AnalyticsOverview {
  totals: {
    products: number;
    batches: number;
    twins: number;
    scans: number;
  };
  status_breakdown: Record<TwinStatus, number>;
  verification_methods: {
    WATERMARK: number;
    QR: number;
    fallback_rate: number;
  };
  verdicts: {
    GENUINE: number;
    FAKE: number;
    ALREADY_CLAIMED: number;
  };
  clone_alerts: Array<{
    twin_id: string;
    serial_number: string;
    already_claimed_scans: number;
    last_seen: string;
  }>;
  scans_per_day: Array<{
    date: string;
    watermark: number;
    qr: number;
    fake: number;
  }>;
}

export interface RetailerInventoryItem {
  twin_id: string;
  serial_number: string;
  status: TwinStatus;
  product: {
    name: string;
    sku: string;
    mrp: number;
  };
  dispatched_at: string | null;
  received_at: string | null;
}

export interface RetailerInventoryResponse {
  twins: RetailerInventoryItem[];
  counts: {
    IN_TRANSIT: number;
    IN_RETAIL: number;
  };
}

export interface RetailerSaleItem {
  twin_id: string;
  serial_number: string;
  product_name: string;
  consumer_name: string;
  sale_price: number;
  invoice_no: string;
  sold_at: string;
}

export interface ConsumerLookupResult {
  user_id: string;
  full_name: string;
  email_masked: string;
}

export interface ConsumerVaultItem {
  twin_id: string;
  serial_number: string;
  product: {
    name: string;
    brand: string;
    mrp: number;
  };
  acquired_at: string;
  acquired_via: 'FIRST_SALE' | 'RESOLD';
  has_active_transfer: boolean;
}

export interface TransferInitiateResponse {
  transfer_id: string;
  twin_id: string;
  qr_payload: string;
  status: TransferStatus;
  ttl_seconds: number;
  expires_at: string;
}

export interface TransferPollResponse {
  transfer_id: string;
  status: TransferStatus;
  expires_at: string;
  claimed_at: string | null;
}

export interface TransferClaimResponse {
  twin: TwinView;
  transferred_at: string;
  event: TimelineEvent;
}

export interface ScanResponseData {
  scan_id: string;
  verdict: ScanVerdict;
  verification_method: VerificationMethod;
  confidence: number;
  is_owner: boolean;
  role_view: 'FULL' | 'LIMITED' | 'NONE';
  allowed_actions: AllowedAction[];
  twin: TwinView | LimitedTwinView | null;
  reason?: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}

export class ApiError extends Error {
  code: ErrorCode;
  status?: number;
  details?: Record<string, any>;

  constructor(message: string, code: ErrorCode, status?: number, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

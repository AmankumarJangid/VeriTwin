/**
 * VeriTwin — Shared Contract Types (Backend ⇄ Frontend)
 * Source of truth: 00_SHARED_CONTRACT.md
 * Contract Version: 1.0.0
 */

// ==========================================
// 1. Enums (§3.1)
// ==========================================

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

export type RoleView = 'FULL' | 'LIMITED' | 'NONE';

// ==========================================
// 2. Error Codes (§6.3)
// ==========================================

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

// ==========================================
// 3. Shared Object Shapes (§6.4)
// ==========================================

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

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  mrp: number;
  currency: 'INR' | string;
  material: string;
  specs: Record<string, string | number | boolean>;
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
  metadata?: Record<string, unknown>;
  created_at: string;
  event_hash: string;
}

export interface CurrentRetailerInfo {
  user_id: string;
  organization_name: string;
}

export interface OwnerInfo {
  user_id: string;
  full_name: string;
}

export interface TwinView {
  twin_id: string;
  serial_number: string;
  twin_code?: string; // MANUFACTURER only
  status: TwinStatus;
  product: Product;
  batch: {
    batch_id: string;
    batch_no: string;
    manufactured_on: string;
    factory_location: string;
  };
  current_retailer: CurrentRetailerInfo | null;
  owner: OwnerInfo | null;
  claimed_at: string | null;
  timeline: TimelineEvent[];
}

export interface LimitedTwinView {
  serial_number: string;
  status: 'SOLD';
  claimed_at: string | null;
  product: {
    name: string;
    brand: string;
    sku: string;
  };
}

// ==========================================
// 4. API Envelopes (§6.1 & §6.2)
// ==========================================

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiPaginationMeta;
}

export interface ApiErrorDetail {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

// ==========================================
// 5. Auth DTOs (§7.1)
// ==========================================

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role?: UserRole;
  organization_name?: string;
  invite_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

// ==========================================
// 6. Manufacturer DTOs (§7.2)
// ==========================================

export interface CreateProductRequest {
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  mrp: number;
  currency?: string;
  material: string;
  specs: Record<string, string | number | boolean>;
  description: string;
}

export interface UpdateProductRequest {
  name?: string;
  mrp?: number;
  material?: string;
  specs?: Record<string, string | number | boolean>;
  description?: string;
}

export interface ProductDetailResponseData {
  product: Product;
  stats: {
    twins_total: number;
    sold: number;
    in_retail: number;
  };
}

export interface CreateBatchRequest {
  product_id: string;
  batch_no: string;
  planned_quantity: number;
  manufactured_on: string;
  factory_location: string;
  notes?: string;
}

export interface CreatedTwinAssetUnit {
  twin_id: string;
  serial_number: string;
  twin_code: string;
  status: TwinStatus;
  watermarked_logo_url: string;
  fallback_qr_url: string;
  fallback_qr_payload: string;
  created_at: string;
}

export interface CreateTwinsResponseData {
  count: number;
  twins: CreatedTwinAssetUnit[];
}

export interface ManufacturerTwinListItem {
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

export interface TwinDetailWithAssetsResponseData {
  twin: TwinView;
  assets: {
    watermarked_logo_url: string;
    fallback_qr_url: string;
    fallback_qr_payload: string;
  };
}

export interface AppendTwinEventRequest {
  event_type: 'QA_PASSED' | 'DISPATCHED_TO_RETAIL';
  notes?: string;
  metadata?: {
    retailer_id?: string;
    [key: string]: unknown;
  };
}

export interface BulkBatchEventRequest {
  event_type: 'QA_PASSED' | 'DISPATCHED_TO_RETAIL';
  notes?: string;
  retailer_id?: string;
}

export interface BulkBatchEventResponseData {
  updated: number;
  skipped: Array<{
    twin_id: string;
    reason: string;
    current_status: TwinStatus;
  }>;
}

export interface RetailerOption {
  user_id: string;
  organization_name: string;
  email: string;
}

export interface DailyScanStats {
  date: string;
  watermark: number;
  qr: number;
  fake: number;
}

export interface CloneAlert {
  twin_id: string;
  serial_number: string;
  already_claimed_scans: number;
  last_seen: string;
}

export interface ManufacturerAnalytics {
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
  clone_alerts: CloneAlert[];
  scans_per_day: DailyScanStats[];
}

export interface AuditFeedItem extends TimelineEvent {
  twin_id: string;
  serial_number: string;
}

export interface IntegrityCheckResponseData {
  valid: boolean;
  events_checked: number;
  broken_at_event_id: string | null;
}

// ==========================================
// 7. Retailer DTOs (§7.3)
// ==========================================

export interface RetailerInventoryItem {
  twin_id: string;
  serial_number: string;
  status: TwinStatus;
  product: {
    name: string;
    sku: string;
    mrp: number;
  };
  dispatched_at: string;
  received_at?: string;
}

export interface RetailerInventoryResponseData {
  twins: RetailerInventoryItem[];
  counts: {
    IN_TRANSIT: number;
    IN_RETAIL: number;
  };
}

export interface RetailerAppendEventRequest {
  event_type: 'RECEIVED_AT_RETAIL' | 'INSPECTED';
  notes?: string;
  metadata?: {
    condition?: 'OK' | 'DAMAGED' | 'SUSPICIOUS';
    [key: string]: unknown;
  };
}

export interface ConsumerLookupResponseData {
  consumer: {
    user_id: string;
    full_name: string;
    email_masked: string;
  };
}

export interface RetailerSellRequest {
  consumer_id: string;
  sale_price: number;
  invoice_no: string;
  notes?: string;
}

export interface RetailerSellResponseData {
  twin_id: string;
  status: 'SOLD';
  owner: {
    user_id: string;
    full_name: string;
  };
  event: TimelineEvent;
}

export interface RetailerSaleHistoryItem {
  twin_id: string;
  serial_number: string;
  product_name: string;
  consumer_name: string;
  sale_price: number;
  invoice_no: string;
  sold_at: string;
}

// ==========================================
// 8. Consumer DTOs (§7.4)
// ==========================================

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

export interface CreateTransferResponseData {
  transfer_id: string;
  twin_id: string;
  qr_payload: string;
  status: TransferStatus;
  ttl_seconds: number;
  expires_at: string;
}

export interface TransferStatusResponseData {
  transfer_id: string;
  status: TransferStatus;
  expires_at: string;
  claimed_at: string | null;
}

export interface ClaimTransferRequest {
  qr_payload: string;
}

export interface ClaimTransferResponseData {
  twin: TwinView;
  transferred_at: string;
  event: TimelineEvent;
}

// ==========================================
// 9. Scan DTOs (§7.5)
// ==========================================

export interface ScanResponseData {
  scan_id: string;
  verdict: ScanVerdict;
  verification_method: VerificationMethod;
  confidence: number;
  is_owner: boolean;
  role_view: RoleView;
  allowed_actions: AllowedAction[];
  twin: TwinView | LimitedTwinView | null;
  reason?: 'TWIN_NOT_FOUND' | 'INVALID_SIGNATURE' | string;
  message: string;
}

export interface ScanQrRequest {
  qr_payload: string;
}

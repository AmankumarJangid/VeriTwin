import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../db/pool';
import {
  buildTwinView,
  buildLimitedView,
  computeAllowedActions,
  RawTwin,
} from '../../services/twinView';

export interface EvaluateParams {
  twinId?: string | null;
  twinCode?: string | null;
  caller: { id: string; role: string };
  method: 'WATERMARK' | 'QR';
  confidence: number;
  reason?: string;
  ip?: string;
  mockTwinCode?: string;
}

export interface VerdictResult {
  scan_id: string;
  verdict: 'GENUINE' | 'FAKE' | 'ALREADY_CLAIMED';
  verification_method: 'WATERMARK' | 'QR';
  confidence: number;
  is_owner: boolean;
  role_view: 'FULL' | 'LIMITED' | 'NONE';
  allowed_actions: string[];
  twin: unknown;
  reason?: string;
  message: string;
}

export async function evaluateAndLog(params: EvaluateParams): Promise<VerdictResult> {
  const { twinId, twinCode, caller, method, confidence, reason, ip } = params;
  const scanId = uuidv4();

  // Try to find twin by ID or twinCode
  let twinRow: any = null;
  if (twinId) {
    const res = await pool.query(
      `SELECT
        t.*,
        p.sku AS product_sku, p.name AS product_name, p.brand AS product_brand,
        p.category AS product_category, p.mrp AS product_mrp, p.currency AS product_currency,
        p.material AS product_material, p.specs AS product_specs,
        b.batch_no, b.manufactured_on AS batch_manufactured_on, b.factory_location AS batch_factory_location,
        ret.organization_name AS current_retailer_org,
        own.full_name AS current_owner_name
       FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       JOIN batches b ON t.batch_id = b.id
       LEFT JOIN users ret ON t.current_retailer_id = ret.id
       LEFT JOIN users own ON t.current_owner_id = own.id
       WHERE t.id = $1`,
      [twinId],
    );
    if (res.rows.length) twinRow = res.rows[0];
  } else if (twinCode) {
    const res = await pool.query(
      `SELECT
        t.*,
        p.sku AS product_sku, p.name AS product_name, p.brand AS product_brand,
        p.category AS product_category, p.mrp AS product_mrp, p.currency AS product_currency,
        p.material AS product_material, p.specs AS product_specs,
        b.batch_no, b.manufactured_on AS batch_manufactured_on, b.factory_location AS batch_factory_location,
        ret.organization_name AS current_retailer_org,
        own.full_name AS current_owner_name
       FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       JOIN batches b ON t.batch_id = b.id
       LEFT JOIN users ret ON t.current_retailer_id = ret.id
       LEFT JOIN users own ON t.current_owner_id = own.id
       WHERE t.twin_code = $1`,
      [twinCode],
    );
    if (res.rows.length) twinRow = res.rows[0];
  }

  // 1. FAKE case
  if (!twinRow || reason === 'INVALID_SIGNATURE') {
    const finalReason = reason ?? 'TWIN_NOT_FOUND';
    await pool.query(
      `INSERT INTO scan_logs (id, twin_id, scanned_by, scanner_role, method, verdict, confidence, decoded_code, reason, ip)
       VALUES ($1, NULL, $2, $3, $4, 'FAKE', $5, $6, $7, $8)`,
      [scanId, caller.id, caller.role, method, confidence, twinCode ?? null, finalReason, ip ?? null],
    );

    return {
      scan_id: scanId,
      verdict: 'FAKE',
      verification_method: method,
      confidence,
      is_owner: false,
      role_view: 'NONE',
      allowed_actions: [],
      twin: null,
      reason: finalReason,
      message: 'No matching Digital Twin exists. This product may be counterfeit.',
    };
  }

  const rawTwin: RawTwin = {
    id: twinRow.id,
    twin_code: twinRow.twin_code,
    serial_number: twinRow.serial_number,
    product_id: twinRow.product_id,
    batch_id: twinRow.batch_id,
    status: twinRow.status,
    current_retailer_id: twinRow.current_retailer_id,
    current_owner_id: twinRow.current_owner_id,
    claimed_at: twinRow.claimed_at,
    original_logo_url: twinRow.original_logo_url,
    watermarked_logo_url: twinRow.watermarked_logo_url,
    fallback_qr_payload: twinRow.fallback_qr_payload,
    fallback_qr_url: twinRow.fallback_qr_url,
    created_by: twinRow.created_by,
    created_at: twinRow.created_at,
    updated_at: twinRow.updated_at,
    product: {
      id: twinRow.product_id,
      sku: twinRow.product_sku,
      name: twinRow.product_name,
      brand: twinRow.product_brand,
      category: twinRow.product_category,
      mrp: twinRow.product_mrp,
      currency: twinRow.product_currency,
      material: twinRow.product_material,
      specs: twinRow.product_specs,
    },
    batch: {
      id: twinRow.batch_id,
      batch_no: twinRow.batch_no,
      manufactured_on: twinRow.batch_manufactured_on,
      factory_location: twinRow.batch_factory_location,
    },
    current_retailer_org: twinRow.current_retailer_org,
    current_owner_name: twinRow.current_owner_name,
  };

  const isOwner = rawTwin.current_owner_id === caller.id;
  const isSold = rawTwin.status === 'SOLD';
  const isManufacturer = caller.role === 'MANUFACTURER';

  // 2. ALREADY_CLAIMED case
  if (isSold && !isOwner && !isManufacturer) {
    await pool.query(
      `INSERT INTO scan_logs (id, twin_id, scanned_by, scanner_role, method, verdict, confidence, decoded_code, reason, ip)
       VALUES ($1, $2, $3, $4, $5, 'ALREADY_CLAIMED', $6, $7, NULL, $8)`,
      [scanId, rawTwin.id, caller.id, caller.role, method, confidence, twinCode ?? null, ip ?? null],
    );

    return {
      scan_id: scanId,
      verdict: 'ALREADY_CLAIMED',
      verification_method: method,
      confidence,
      is_owner: false,
      role_view: 'LIMITED',
      allowed_actions: [],
      twin: buildLimitedView(rawTwin),
      message:
        'This item is already claimed and locked. If you are buying it second-hand, ask the owner to start an in-app transfer.',
    };
  }

  // 3. GENUINE case
  await pool.query(
    `INSERT INTO scan_logs (id, twin_id, scanned_by, scanner_role, method, verdict, confidence, decoded_code, reason, ip)
     VALUES ($1, $2, $3, $4, $5, 'GENUINE', $6, $7, NULL, $8)`,
    [scanId, rawTwin.id, caller.id, caller.role, method, confidence, twinCode ?? null, ip ?? null],
  );

  // Fetch timeline events for full TwinView
  const eventsRes = await pool.query(
    `SELECT
      e.*,
      u.full_name AS actor_name,
      u.organization_name AS actor_org
     FROM lifecycle_events e
     LEFT JOIN users u ON e.actor_id = u.id
     WHERE e.twin_id = $1
     ORDER BY e.id ASC`,
    [rawTwin.id],
  );

  const twinView = buildTwinView(rawTwin, eventsRes.rows, caller.role, caller.id);
  const allowedActions = computeAllowedActions(rawTwin, caller.role, caller.id);

  return {
    scan_id: scanId,
    verdict: 'GENUINE',
    verification_method: method,
    confidence,
    is_owner: isOwner,
    role_view: 'FULL',
    allowed_actions: allowedActions,
    twin: twinView,
    message: 'Authentic product verified.',
  };
}

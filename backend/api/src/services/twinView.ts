// src/services/twinView.ts
// Single source of truth for TwinView, LimitedTwinView, TimelineEvent, and allowed_actions.
// Strictly adheres to 00_SHARED_CONTRACT.md §6.4 & §7.5.

export interface RawProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  mrp: string | number;
  currency: string;
  material?: string | null;
  specs?: Record<string, unknown>;
  description?: string | null;
}

export interface RawBatch {
  id: string;
  batch_no: string;
  manufactured_on: string | Date;
  factory_location?: string | null;
}

export interface RawTwin {
  id: string;
  twin_code: string;
  serial_number: string;
  product_id: string;
  batch_id: string;
  status: string;
  current_retailer_id: string | null;
  current_owner_id: string | null;
  claimed_at: string | Date | null;
  original_logo_url: string;
  watermarked_logo_url: string;
  fallback_qr_payload: string;
  fallback_qr_url: string;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  // Joins (optional)
  product?: RawProduct;
  batch?: RawBatch;
  current_retailer_org?: string | null;
  current_owner_name?: string | null;
}

export interface RawEvent {
  id: string | number;
  twin_id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name?: string | null;
  actor_org?: string | null;
  from_status: string | null;
  to_status: string;
  from_owner_id?: string | null;
  to_owner_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  prev_hash: string;
  event_hash: string;
  created_at: string | Date;
}

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string;
  actor: {
    user_id: string | null;
    display: string;
    role: string | null;
  };
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  event_hash: string;
}

export interface TwinView {
  twin_id: string;
  serial_number: string;
  twin_code?: string; // MANUFACTURER only
  status: string;
  product: {
    product_id: string;
    sku: string;
    name: string;
    brand: string;
    category: string;
    mrp: number;
    currency: string;
    material: string | null;
    specs: Record<string, unknown>;
  };
  batch: {
    batch_id: string;
    batch_no: string;
    manufactured_on: string;
    factory_location: string | null;
  };
  current_retailer: {
    user_id: string;
    organization_name: string;
  } | null;
  owner: {
    user_id: string;
    full_name: string;
  } | null;
  claimed_at: string | null;
  timeline: TimelineEvent[];
}

export interface LimitedTwinView {
  serial_number: string;
  status: string;
  claimed_at: string | null;
  product: {
    name: string;
    brand: string;
    sku: string;
  };
}

export function computeAllowedActions(
  twin: { status: string; current_retailer_id?: string | null; current_owner_id?: string | null },
  callerRole: string,
  callerId: string,
): string[] {
  if (callerRole === 'MANUFACTURER') {
    return ['APPEND_EVENT'];
  }
  if (callerRole === 'RETAILER' && twin.current_retailer_id === callerId) {
    if (twin.status === 'IN_TRANSIT') return ['RECEIVE'];
    if (twin.status === 'IN_RETAIL') return ['INSPECT', 'SELL'];
  }
  if (callerRole === 'CONSUMER' && twin.status === 'SOLD' && twin.current_owner_id === callerId) {
    return ['INITIATE_TRANSFER'];
  }
  return [];
}

export function buildTimelineEvent(event: RawEvent, viewerRole: string): TimelineEvent {
  let display = 'System';
  let userId: string | null = event.actor_id ?? null;

  if (event.actor_role === 'MANUFACTURER') {
    display = event.actor_org || event.actor_name || 'Manufacturer';
  } else if (event.actor_role === 'RETAILER') {
    display = event.actor_org || event.actor_name || 'Retailer';
  } else if (event.actor_role === 'CONSUMER') {
    if (viewerRole === 'CONSUMER') {
      display = event.event_type === 'RESOLD' ? 'Previous owner' : 'Owner';
      userId = null; // Masked for consumers
    } else {
      display = event.actor_name || 'Consumer';
    }
  }

  const createdAtIso =
    event.created_at instanceof Date ? event.created_at.toISOString() : new Date(event.created_at).toISOString();

  return {
    event_id: String(event.id),
    event_type: event.event_type,
    from_status: event.from_status,
    to_status: event.to_status,
    actor: {
      user_id: userId,
      display,
      role: event.actor_role,
    },
    notes: event.notes ?? null,
    metadata: event.metadata ?? {},
    created_at: createdAtIso,
    event_hash: event.event_hash,
  };
}

export function buildTwinView(
  twin: RawTwin,
  events: RawEvent[],
  callerRole: string,
  callerId: string,
): TwinView {
  const isOwner = twin.current_owner_id === callerId;
  const isManufacturer = callerRole === 'MANUFACTURER';

  const view: TwinView = {
    twin_id: twin.id,
    serial_number: twin.serial_number,
    status: twin.status,
    product: {
      product_id: twin.product?.id ?? twin.product_id,
      sku: twin.product?.sku ?? '',
      name: twin.product?.name ?? '',
      brand: twin.product?.brand ?? '',
      category: twin.product?.category ?? '',
      mrp: Number(twin.product?.mrp ?? 0),
      currency: twin.product?.currency ?? 'INR',
      material: twin.product?.material ?? null,
      specs: twin.product?.specs ?? {},
    },
    batch: {
      batch_id: twin.batch?.id ?? twin.batch_id,
      batch_no: twin.batch?.batch_no ?? '',
      manufactured_on:
        twin.batch?.manufactured_on instanceof Date
          ? twin.batch.manufactured_on.toISOString().split('T')[0]
          : String(twin.batch?.manufactured_on ?? ''),
      factory_location: twin.batch?.factory_location ?? null,
    },
    current_retailer:
      callerRole === 'CONSUMER' || !twin.current_retailer_id
        ? null
        : {
            user_id: twin.current_retailer_id,
            organization_name: twin.current_retailer_org ?? 'Retailer',
          },
    owner:
      (isManufacturer || isOwner) && twin.current_owner_id
        ? {
            user_id: twin.current_owner_id,
            full_name: twin.current_owner_name ?? 'Owner',
          }
        : null,
    claimed_at: twin.claimed_at
      ? twin.claimed_at instanceof Date
        ? twin.claimed_at.toISOString()
        : new Date(twin.claimed_at).toISOString()
      : null,
    timeline: events.map((ev) => buildTimelineEvent(ev, callerRole)),
  };

  if (isManufacturer) {
    view.twin_code = twin.twin_code;
  }

  return view;
}

export function buildLimitedView(twin: RawTwin): LimitedTwinView {
  return {
    serial_number: twin.serial_number,
    status: twin.status,
    claimed_at: twin.claimed_at
      ? twin.claimed_at instanceof Date
        ? twin.claimed_at.toISOString()
        : new Date(twin.claimed_at).toISOString()
      : null,
    product: {
      name: twin.product?.name ?? '',
      brand: twin.product?.brand ?? '',
      sku: twin.product?.sku ?? '',
    },
  };
}

import { PoolClient } from 'pg';
import * as eventLog from './eventLog';
import { invalidStateTransition, forbidden } from '../utils/errors';

type TwinStatus = 'MANUFACTURED' | 'QA_PASSED' | 'IN_TRANSIT' | 'IN_RETAIL' | 'SOLD';
type EventType =
  | 'MANUFACTURED'
  | 'QA_PASSED'
  | 'DISPATCHED_TO_RETAIL'
  | 'RECEIVED_AT_RETAIL'
  | 'INSPECTED'
  | 'FIRST_SALE'
  | 'RESOLD';

interface TransitionRule {
  fromStatus: TwinStatus[];
  toStatus: TwinStatus;
  allowedRoles: string[];
}

const TRANSITIONS: Record<EventType, TransitionRule> = {
  MANUFACTURED: {
    fromStatus: [],
    toStatus: 'MANUFACTURED',
    allowedRoles: ['MANUFACTURER'],
  },
  QA_PASSED: {
    fromStatus: ['MANUFACTURED'],
    toStatus: 'QA_PASSED',
    allowedRoles: ['MANUFACTURER'],
  },
  DISPATCHED_TO_RETAIL: {
    fromStatus: ['QA_PASSED'],
    toStatus: 'IN_TRANSIT',
    allowedRoles: ['MANUFACTURER'],
  },
  RECEIVED_AT_RETAIL: {
    fromStatus: ['IN_TRANSIT'],
    toStatus: 'IN_RETAIL',
    allowedRoles: ['RETAILER'],
  },
  INSPECTED: {
    fromStatus: ['IN_RETAIL'],
    toStatus: 'IN_RETAIL',
    allowedRoles: ['RETAILER'],
  },
  FIRST_SALE: {
    fromStatus: ['IN_RETAIL'],
    toStatus: 'SOLD',
    allowedRoles: ['RETAILER', 'CONSUMER'],
  },
  RESOLD: {
    fromStatus: ['SOLD'],
    toStatus: 'SOLD',
    allowedRoles: ['CONSUMER'],
  },
};

interface Actor {
  id: string;
  role: string;
}

export interface ApplyEventPayload {
  notes?: string | null;
  metadata?: Record<string, unknown>;
  toOwnerId?: string | null;
  currentRetailerId?: string | null;
}

export async function applyEvent(
  client: PoolClient,
  twinId: string,
  eventType: EventType,
  actor: Actor,
  payload: ApplyEventPayload = {},
): Promise<any> {
  // Lock the twin row
  const twinResult = await client.query<{
    id: string;
    status: TwinStatus;
    current_owner_id: string | null;
    current_retailer_id: string | null;
  }>(
    `SELECT id, status, current_owner_id, current_retailer_id FROM digital_twins WHERE id = $1 FOR UPDATE`,
    [twinId],
  );

  if (!twinResult.rows.length) {
    throw new Error(`Twin not found: ${twinId}`);
  }

  const twin = twinResult.rows[0];
  const rule = TRANSITIONS[eventType];

  if (!rule) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  // Validate role
  if (!rule.allowedRoles.includes(actor.role)) {
    throw forbidden(`Role '${actor.role}' cannot perform event '${eventType}'`);
  }

  // Validate current status (empty fromStatus means genesis only)
  if (rule.fromStatus.length > 0 && !rule.fromStatus.includes(twin.status)) {
    throw invalidStateTransition(twin.status, rule.fromStatus);
  }

  const fromStatus = twin.status;
  const toStatus = rule.toStatus;
  const fromOwnerId = twin.current_owner_id;
  const toOwnerId = payload.toOwnerId ?? twin.current_owner_id;

  // Update twin columns
  const updateFields: string[] = ['status = $2', 'updated_at = now()'];
  const updateValues: unknown[] = [twinId, toStatus];
  let paramIdx = 3;

  if (payload.currentRetailerId !== undefined) {
    updateFields.push(`current_retailer_id = $${paramIdx++}`);
    updateValues.push(payload.currentRetailerId);
  }

  if (payload.toOwnerId !== undefined) {
    updateFields.push(`current_owner_id = $${paramIdx++}`);
    updateValues.push(payload.toOwnerId);

    if (toStatus === 'SOLD' && fromStatus !== 'SOLD') {
      updateFields.push(`claimed_at = $${paramIdx++}`);
      updateValues.push(new Date().toISOString());
    }
  }

  await client.query(
    `UPDATE digital_twins SET ${updateFields.join(', ')} WHERE id = $1`,
    updateValues,
  );

  // Append lifecycle event
  const createdEvent = await eventLog.append(client, {
    twinId,
    eventType,
    actorId: actor.id,
    actorRole: actor.role,
    fromStatus,
    toStatus,
    fromOwnerId,
    toOwnerId: typeof toOwnerId === 'string' ? toOwnerId : null,
    notes: payload.notes,
    metadata: payload.metadata ?? {},
  });

  return createdEvent;
}

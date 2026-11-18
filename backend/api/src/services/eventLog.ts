import { PoolClient } from 'pg';
import { sha256hex } from '../utils/hash';

export interface AppendEventParams {
  twinId: string;
  eventType: string;
  actorId: string | null;
  actorRole: string | null;
  fromStatus: string | null;
  toStatus: string;
  fromOwnerId: string | null;
  toOwnerId: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export async function append(client: PoolClient, params: AppendEventParams): Promise<any> {
  const {
    twinId, eventType, actorId, actorRole,
    fromStatus, toStatus, fromOwnerId, toOwnerId,
    notes, metadata = {},
  } = params;

  // Get previous event hash (or genesis)
  const prevResult = await client.query<{ event_hash: string }>(
    `SELECT event_hash FROM lifecycle_events WHERE twin_id = $1 ORDER BY id DESC LIMIT 1`,
    [twinId],
  );
  const prevHash = prevResult.rows[0]?.event_hash ?? '0'.repeat(64);

  const createdAt = new Date().toISOString();
  const canonicalMeta = JSON.stringify(metadata, Object.keys(metadata).sort());

  const eventHash = sha256hex(
    prevHash +
    twinId +
    eventType +
    (actorId ?? '') +
    toStatus +
    canonicalMeta +
    createdAt,
  );

  const insertResult = await client.query(
    `INSERT INTO lifecycle_events
      (twin_id, event_type, actor_id, actor_role, from_status, to_status,
       from_owner_id, to_owner_id, notes, metadata, prev_hash, event_hash, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      twinId, eventType, actorId, actorRole,
      fromStatus, toStatus,
      fromOwnerId, toOwnerId,
      notes ?? null,
      JSON.stringify(metadata),
      prevHash,
      eventHash,
      createdAt,
    ],
  );

  return insertResult.rows[0];
}

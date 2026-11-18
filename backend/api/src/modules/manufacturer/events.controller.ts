import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import {
  validationError,
  notFound,
  invalidStateTransition,
} from '../../utils/errors';
import * as stateMachine from '../../services/twinStateMachine';
import { buildTimelineEvent } from '../../services/twinView';

export const twinEventSchema = z.object({
  event_type: z.enum(['QA_PASSED', 'DISPATCHED_TO_RETAIL']),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const batchEventSchema = z.object({
  event_type: z.enum(['QA_PASSED', 'DISPATCHED_TO_RETAIL']),
  notes: z.string().optional(),
  retailer_id: z.string().uuid().optional(),
});

export async function createTwinEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const { twinId } = req.params;
    const { event_type, notes, metadata = {} } =
      req.body as z.infer<typeof twinEventSchema>;
    const manufacturerId = req.user!.id;

    // Verify twin belongs to this manufacturer
    const twinCheck = await client.query(
      `SELECT t.id, t.status FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       WHERE t.id = $1 AND p.manufacturer_id = $2`,
      [twinId, manufacturerId],
    );
    if (!twinCheck.rows.length) {
      throw notFound('Digital twin not found or not owned by manufacturer');
    }

    let retailerId: string | null = null;
    if (event_type === 'DISPATCHED_TO_RETAIL') {
      const rid = metadata.retailer_id as string | undefined;
      if (!rid) {
        throw validationError([
          {
            field: 'metadata.retailer_id',
            message: 'retailer_id is required for DISPATCHED_TO_RETAIL',
          },
        ]);
      }
      // Check retailer exists and has role RETAILER
      const retCheck = await client.query(
        `SELECT id, organization_name FROM users WHERE id = $1 AND role = 'RETAILER'`,
        [rid],
      );
      if (!retCheck.rows.length) {
        throw notFound('Retailer not found or not valid RETAILER role');
      }
      retailerId = rid;
    }

    await client.query('BEGIN');

    const createdEventRow = await stateMachine.applyEvent(
      client,
      twinId,
      event_type,
      { id: manufacturerId, role: 'MANUFACTURER' },
      {
        notes: notes ?? null,
        metadata,
        currentRetailerId: retailerId,
      },
    );

    // Fetch actor info for building TimelineEvent
    const actorRes = await client.query(
      `SELECT organization_name, full_name FROM users WHERE id = $1`,
      [manufacturerId],
    );
    const actor = actorRes.rows[0];

    await client.query('COMMIT');

    const rawEvent = {
      ...createdEventRow,
      actor_org: actor?.organization_name,
      actor_name: actor?.full_name,
    };

    const timelineEvent = buildTimelineEvent(rawEvent, req.user!.role);
    const newStatus = event_type === 'QA_PASSED' ? 'QA_PASSED' : 'IN_TRANSIT';

    res.status(201).json({
      success: true,
      data: {
        event: timelineEvent,
        twin_status: newStatus,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function createBatchEvents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const client = await pool.connect();
  try {
    const { batchId } = req.params;
    const { event_type, notes, retailer_id } =
      req.body as z.infer<typeof batchEventSchema>;
    const manufacturerId = req.user!.id;

    // Verify batch belongs to manufacturer
    const batchCheck = await client.query(
      `SELECT b.id FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.id = $1 AND p.manufacturer_id = $2`,
      [batchId, manufacturerId],
    );
    if (!batchCheck.rows.length) {
      throw notFound('Batch not found or not owned by manufacturer');
    }

    if (event_type === 'DISPATCHED_TO_RETAIL') {
      if (!retailer_id) {
        throw validationError([
          {
            field: 'retailer_id',
            message: 'retailer_id is required for DISPATCHED_TO_RETAIL',
          },
        ]);
      }
      const retCheck = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'RETAILER'`,
        [retailer_id],
      );
      if (!retCheck.rows.length) {
        throw notFound('Retailer not found or not valid RETAILER role');
      }
    }

    const expectedFromStatus =
      event_type === 'QA_PASSED' ? 'MANUFACTURED' : 'QA_PASSED';

    // Fetch all twins in batch
    const twinsRes = await client.query(
      `SELECT id, status FROM digital_twins WHERE batch_id = $1 ORDER BY serial_number ASC`,
      [batchId],
    );

    let updated = 0;
    const skipped: Array<{
      twin_id: string;
      reason: string;
      current_status: string;
    }> = [];

    const actor = { id: manufacturerId, role: 'MANUFACTURER' };
    const metadata = retailer_id ? { retailer_id } : {};

    for (const twin of twinsRes.rows) {
      if (twin.status !== expectedFromStatus) {
        skipped.push({
          twin_id: twin.id,
          reason: 'INVALID_STATE_TRANSITION',
          current_status: twin.status,
        });
        continue;
      }

      await client.query('BEGIN');
      try {
        await stateMachine.applyEvent(client, twin.id, event_type, actor, {
          notes,
          metadata,
          currentRetailerId: retailer_id ?? null,
        });
        await client.query('COMMIT');
        updated++;
      } catch (err) {
        await client.query('ROLLBACK');
        skipped.push({
          twin_id: twin.id,
          reason: 'UPDATE_FAILED',
          current_status: twin.status,
        });
      }
    }

    res.json({
      success: true,
      data: {
        updated,
        skipped,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
}

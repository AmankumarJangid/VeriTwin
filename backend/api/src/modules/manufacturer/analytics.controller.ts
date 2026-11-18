import { Request, Response, NextFunction } from 'express';
import { pool } from '../../db/pool';
import { notFound } from '../../utils/errors';
import { parsePagination, buildMeta } from '../../utils/pagination';
import { buildTimelineEvent } from '../../services/twinView';
import { sha256hex } from '../../utils/hash';

export async function listRetailers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id AS user_id, organization_name, email
       FROM users
       WHERE role = 'RETAILER'
       ORDER BY organization_name ASC`,
    );

    res.json({
      success: true,
      data: {
        retailers: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnalyticsOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const days = parseInt(req.query.days as string, 10) || 30;

    // 1. Totals
    const prodCountRes = await pool.query(
      `SELECT COUNT(*) FROM products WHERE manufacturer_id = $1`,
      [manufacturerId],
    );
    const batchCountRes = await pool.query(
      `SELECT COUNT(*) FROM batches b JOIN products p ON b.product_id = p.id WHERE p.manufacturer_id = $1`,
      [manufacturerId],
    );
    const twinCountRes = await pool.query(
      `SELECT COUNT(*) FROM digital_twins t JOIN products p ON t.product_id = p.id WHERE p.manufacturer_id = $1`,
      [manufacturerId],
    );
    const scanCountRes = await pool.query(
      `SELECT COUNT(*) FROM scan_logs s
       LEFT JOIN digital_twins t ON s.twin_id = t.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE (p.manufacturer_id = $1 OR s.twin_id IS NULL)
         AND s.created_at >= now() - ($2 || ' days')::interval`,
      [manufacturerId, days],
    );

    const totals = {
      products: parseInt(prodCountRes.rows[0].count, 10),
      batches: parseInt(batchCountRes.rows[0].count, 10),
      twins: parseInt(twinCountRes.rows[0].count, 10),
      scans: parseInt(scanCountRes.rows[0].count, 10),
    };

    // 2. Status breakdown
    const statusRes = await pool.query(
      `SELECT t.status, COUNT(*) as count
       FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       WHERE p.manufacturer_id = $1
       GROUP BY t.status`,
      [manufacturerId],
    );
    const statusBreakdown: Record<string, number> = {
      MANUFACTURED: 0,
      QA_PASSED: 0,
      IN_TRANSIT: 0,
      IN_RETAIL: 0,
      SOLD: 0,
    };
    for (const r of statusRes.rows) {
      statusBreakdown[r.status] = parseInt(r.count, 10);
    }

    // 3. Verification methods
    const methodRes = await pool.query(
      `SELECT s.method, COUNT(*) as count
       FROM scan_logs s
       LEFT JOIN digital_twins t ON s.twin_id = t.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE (p.manufacturer_id = $1 OR s.twin_id IS NULL)
         AND s.created_at >= now() - ($2 || ' days')::interval
       GROUP BY s.method`,
      [manufacturerId, days],
    );
    const verificationMethods = {
      WATERMARK: 0,
      QR: 0,
      fallback_rate: 0,
    };
    for (const r of methodRes.rows) {
      if (r.method === 'WATERMARK') verificationMethods.WATERMARK = parseInt(r.count, 10);
      if (r.method === 'QR') verificationMethods.QR = parseInt(r.count, 10);
    }
    const totalScans = verificationMethods.WATERMARK + verificationMethods.QR;
    verificationMethods.fallback_rate =
      totalScans > 0 ? parseFloat((verificationMethods.QR / totalScans).toFixed(2)) : 0;

    // 4. Verdicts
    const verdictRes = await pool.query(
      `SELECT s.verdict, COUNT(*) as count
       FROM scan_logs s
       LEFT JOIN digital_twins t ON s.twin_id = t.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE (p.manufacturer_id = $1 OR s.twin_id IS NULL)
         AND s.created_at >= now() - ($2 || ' days')::interval
       GROUP BY s.verdict`,
      [manufacturerId, days],
    );
    const verdicts: Record<string, number> = {
      GENUINE: 0,
      FAKE: 0,
      ALREADY_CLAIMED: 0,
    };
    for (const r of verdictRes.rows) {
      if (verdicts[r.verdict] !== undefined) {
        verdicts[r.verdict] = parseInt(r.count, 10);
      }
    }

    // 5. Clone alerts (twins with >= 3 ALREADY_CLAIMED scans by non-owners in window)
    const cloneRes = await pool.query(
      `SELECT
        t.id AS twin_id,
        t.serial_number,
        COUNT(s.id) AS already_claimed_scans,
        MAX(s.created_at) AS last_seen
       FROM scan_logs s
       JOIN digital_twins t ON s.twin_id = t.id
       JOIN products p ON t.product_id = p.id
       WHERE p.manufacturer_id = $1
         AND s.verdict = 'ALREADY_CLAIMED'
         AND s.created_at >= now() - ($2 || ' days')::interval
       GROUP BY t.id, t.serial_number
       HAVING COUNT(s.id) >= 3
       ORDER BY already_claimed_scans DESC`,
      [manufacturerId, days],
    );
    const cloneAlerts = cloneRes.rows.map((r) => ({
      twin_id: r.twin_id,
      serial_number: r.serial_number,
      already_claimed_scans: parseInt(r.already_claimed_scans, 10),
      last_seen: new Date(r.last_seen).toISOString(),
    }));

    // 6. Scans per day
    const scansPerDayRes = await pool.query(
      `SELECT
        date_trunc('day', s.created_at)::date AS date,
        COUNT(*) FILTER (WHERE s.method = 'WATERMARK') AS watermark,
        COUNT(*) FILTER (WHERE s.method = 'QR') AS qr,
        COUNT(*) FILTER (WHERE s.verdict = 'FAKE') AS fake
       FROM scan_logs s
       LEFT JOIN digital_twins t ON s.twin_id = t.id
       LEFT JOIN products p ON t.product_id = p.id
       WHERE (p.manufacturer_id = $1 OR s.twin_id IS NULL)
         AND s.created_at >= now() - ($2 || ' days')::interval
       GROUP BY date_trunc('day', s.created_at)::date
       ORDER BY date ASC`,
      [manufacturerId, days],
    );
    const scansPerDay = scansPerDayRes.rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      watermark: parseInt(r.watermark, 10),
      qr: parseInt(r.qr, 10),
      fake: parseInt(r.fake, 10),
    }));

    res.json({
      success: true,
      data: {
        totals,
        status_breakdown: statusBreakdown,
        verification_methods: verificationMethods,
        verdicts,
        clone_alerts: cloneAlerts,
        scans_per_day: scansPerDay,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditFeed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const manufacturerId = req.user!.id;
    const { page, limit, offset } = parsePagination(req.query);
    const { twin_id, event_type } = req.query;

    const conditions: string[] = ['p.manufacturer_id = $1'];
    const values: unknown[] = [manufacturerId];
    let idx = 2;

    if (twin_id) {
      conditions.push(`e.twin_id = $${idx++}`);
      values.push(twin_id);
    }
    if (event_type) {
      conditions.push(`e.event_type = $${idx++}`);
      values.push(event_type);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM lifecycle_events e
       JOIN digital_twins t ON e.twin_id = t.id
       JOIN products p ON t.product_id = p.id
       WHERE ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT
        e.*,
        t.serial_number,
        u.full_name AS actor_name,
        u.organization_name AS actor_org
      FROM lifecycle_events e
      JOIN digital_twins t ON e.twin_id = t.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON e.actor_id = u.id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);

    const events = result.rows.map((row) => {
      const timelineEvent = buildTimelineEvent(row, req.user!.role);
      return {
        ...timelineEvent,
        twin_id: row.twin_id,
        serial_number: row.serial_number,
      };
    });

    res.json({
      success: true,
      data: { events },
      meta: buildMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function checkTwinIntegrity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { twinId } = req.params;
    const manufacturerId = req.user!.id;

    // Verify twin belongs to manufacturer
    const twinCheck = await pool.query(
      `SELECT t.id FROM digital_twins t
       JOIN products p ON t.product_id = p.id
       WHERE t.id = $1 AND p.manufacturer_id = $2`,
      [twinId, manufacturerId],
    );
    if (!twinCheck.rows.length) {
      throw notFound('Digital twin not found or not owned by manufacturer');
    }

    const eventsRes = await pool.query(
      `SELECT * FROM lifecycle_events WHERE twin_id = $1 ORDER BY id ASC`,
      [twinId],
    );

    let prevHash = '0'.repeat(64);
    let eventsChecked = 0;
    let brokenAtEventId: string | null = null;
    let isValid = true;

    for (const ev of eventsRes.rows) {
      eventsChecked++;

      // Verify prev_hash matches chain
      if (ev.prev_hash !== prevHash) {
        isValid = false;
        brokenAtEventId = String(ev.id);
        break;
      }

      // Recompute event_hash
      const createdAtIso =
        ev.created_at instanceof Date
          ? ev.created_at.toISOString()
          : new Date(ev.created_at).toISOString();

      const metadata = typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata ?? {};
      const canonicalMeta = JSON.stringify(metadata, Object.keys(metadata).sort());

      const computedHash = sha256hex(
        prevHash +
        ev.twin_id +
        ev.event_type +
        (ev.actor_id ?? '') +
        ev.to_status +
        canonicalMeta +
        createdAtIso,
      );

      if (computedHash !== ev.event_hash) {
        isValid = false;
        brokenAtEventId = String(ev.id);
        break;
      }

      prevHash = ev.event_hash;
    }

    res.json({
      success: true,
      data: {
        valid: isValid,
        events_checked: eventsChecked,
        broken_at_event_id: brokenAtEventId,
      },
    });
  } catch (error) {
    next(error);
  }
}

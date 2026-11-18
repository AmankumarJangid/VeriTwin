import { describe, it, expect } from 'vitest';
import {
  buildTwinView,
  buildLimitedView,
  computeAllowedActions,
  RawTwin,
} from '../../src/services/twinView';

describe('TwinView Masking and Allowed Actions', () => {
  const sampleTwin: RawTwin = {
    id: 'twin-123',
    twin_code: '9F3A27C1',
    serial_number: 'VT-WCH-2026-000123',
    product_id: 'prod-1',
    batch_id: 'batch-1',
    status: 'IN_RETAIL',
    current_retailer_id: 'ret-1',
    current_owner_id: null,
    claimed_at: null,
    original_logo_url: 'http://localhost:4000/api/assets/originals/1.png',
    watermarked_logo_url: 'http://localhost:4000/api/assets/watermarked/1.png',
    fallback_qr_payload: 'VT1.payload',
    fallback_qr_url: 'http://localhost:4000/api/assets/qr/1.png',
    created_by: 'maker-1',
    created_at: new Date('2026-11-17T10:00:00.000Z'),
    updated_at: new Date('2026-11-17T10:00:00.000Z'),
    product: {
      id: 'prod-1',
      sku: 'WCH-001',
      name: 'Chrono Classic',
      brand: 'Aurelia',
      category: 'WATCH',
      mrp: 24999,
      currency: 'INR',
    },
    batch: {
      id: 'batch-1',
      batch_no: 'B-001',
      manufactured_on: '2026-11-10',
    },
    current_retailer_org: 'TimeHouse Retail',
  };

  it('includes twin_code only for MANUFACTURER role', () => {
    const mfrView = buildTwinView(sampleTwin, [], 'MANUFACTURER', 'maker-1');
    expect(mfrView.twin_code).toBe('9F3A27C1');

    const consumerView = buildTwinView(sampleTwin, [], 'CONSUMER', 'user-1');
    expect(consumerView.twin_code).toBeUndefined();

    const retailView = buildTwinView(sampleTwin, [], 'RETAILER', 'ret-1');
    expect(retailView.twin_code).toBeUndefined();
  });

  it('masks retailer information from CONSUMER viewers', () => {
    const consumerView = buildTwinView(sampleTwin, [], 'CONSUMER', 'user-1');
    expect(consumerView.current_retailer).toBeNull();

    const mfrView = buildTwinView(sampleTwin, [], 'MANUFACTURER', 'maker-1');
    expect(mfrView.current_retailer?.organization_name).toBe('TimeHouse Retail');
  });

  it('masks owner identity unless caller is the owner or manufacturer', () => {
    const soldTwin: RawTwin = {
      ...sampleTwin,
      status: 'SOLD',
      current_owner_id: 'user-riya',
      current_owner_name: 'Riya Sharma',
    };

    const riyaView = buildTwinView(soldTwin, [], 'CONSUMER', 'user-riya');
    expect(riyaView.owner?.full_name).toBe('Riya Sharma');

    const arjunView = buildTwinView(soldTwin, [], 'CONSUMER', 'user-arjun');
    expect(arjunView.owner).toBeNull();

    const mfrView = buildTwinView(soldTwin, [], 'MANUFACTURER', 'maker-1');
    expect(mfrView.owner?.full_name).toBe('Riya Sharma');
  });

  it('builds LimitedTwinView with only essential fields', () => {
    const limited = buildLimitedView(sampleTwin);
    expect(limited.serial_number).toBe('VT-WCH-2026-000123');
    expect(limited.product.name).toBe('Chrono Classic');
    expect((limited as any).twin_code).toBeUndefined();
    expect((limited as any).timeline).toBeUndefined();
  });

  it('computes correct allowed_actions based on caller role and state', () => {
    // Manufacturer
    expect(computeAllowedActions(sampleTwin, 'MANUFACTURER', 'maker-1')).toEqual(['APPEND_EVENT']);

    // Assigned Retailer in transit
    expect(computeAllowedActions({ status: 'IN_TRANSIT', current_retailer_id: 'ret-1' }, 'RETAILER', 'ret-1')).toEqual(['RECEIVE']);

    // Assigned Retailer in retail
    expect(computeAllowedActions({ status: 'IN_RETAIL', current_retailer_id: 'ret-1' }, 'RETAILER', 'ret-1')).toEqual(['INSPECT', 'SELL']);

    // Unassigned Retailer
    expect(computeAllowedActions({ status: 'IN_RETAIL', current_retailer_id: 'other-ret' }, 'RETAILER', 'ret-1')).toEqual([]);

    // Consumer owner of sold item
    expect(computeAllowedActions({ status: 'SOLD', current_owner_id: 'user-1' }, 'CONSUMER', 'user-1')).toEqual(['INITIATE_TRANSFER']);

    // Consumer non-owner
    expect(computeAllowedActions({ status: 'SOLD', current_owner_id: 'user-2' }, 'CONSUMER', 'user-1')).toEqual([]);
  });
});

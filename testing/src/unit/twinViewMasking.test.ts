import { describe, it, expect } from 'vitest';

interface RawTwin {
  id: string;
  twin_code: string;
  serial_number: string;
  status: string;
  current_retailer_id: string | null;
  current_retailer_org?: string | null;
  current_owner_id: string | null;
  current_owner_name?: string | null;
  claimed_at: string | null;
}

interface RawEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name?: string | null;
  actor_org?: string | null;
}

function buildTimelineEvent(event: RawEvent, viewerRole: string) {
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

  return { display, user_id: userId, role: event.actor_role };
}

function buildTwinView(twin: RawTwin, events: RawEvent[], callerRole: string, callerId: string) {
  const isOwner = twin.current_owner_id === callerId;
  const isManufacturer = callerRole === 'MANUFACTURER';

  const view: any = {
    twin_id: twin.id,
    serial_number: twin.serial_number,
    status: twin.status,
    current_retailer:
      callerRole === 'CONSUMER' || !twin.current_retailer_id
        ? null
        : { user_id: twin.current_retailer_id, organization_name: twin.current_retailer_org },
    owner:
      (isManufacturer || isOwner) && twin.current_owner_id
        ? { user_id: twin.current_owner_id, full_name: twin.current_owner_name }
        : null,
    claimed_at: twin.claimed_at,
    timeline: events.map((ev) => buildTimelineEvent(ev, callerRole)),
  };

  if (isManufacturer) {
    view.twin_code = twin.twin_code;
  }

  return view;
}

function computeAllowedActions(
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

describe('Special Unit Test: Role-Based Masking & Allowed Actions', () => {
  const sampleTwin: RawTwin = {
    id: 'twin-100',
    twin_code: '4B8A91C2',
    serial_number: 'VT-WCH-2026-000100',
    status: 'SOLD',
    current_retailer_id: 'retailer-uuid',
    current_retailer_org: 'TimeHouse Luxury',
    current_owner_id: 'consumer-riya-uuid',
    current_owner_name: 'Riya Sharma',
    claimed_at: '2026-11-18T10:00:00.000Z',
  };

  const sampleEvents: RawEvent[] = [
    {
      id: '1',
      event_type: 'MANUFACTURED',
      actor_id: 'maker-uuid',
      actor_role: 'MANUFACTURER',
      actor_org: 'Aurelia Watches',
    },
    {
      id: '2',
      event_type: 'FIRST_SALE',
      actor_id: 'retailer-uuid',
      actor_role: 'RETAILER',
      actor_org: 'TimeHouse Luxury',
    },
    {
      id: '3',
      event_type: 'RESOLD',
      actor_id: 'consumer-arjun-uuid',
      actor_role: 'CONSUMER',
      actor_name: 'Arjun Verma',
    },
  ];

  it('masks twin_code from all non-manufacturer callers', () => {
    const mfrView = buildTwinView(sampleTwin, [], 'MANUFACTURER', 'maker-uuid');
    expect(mfrView.twin_code).toBe('4B8A91C2');

    const retView = buildTwinView(sampleTwin, [], 'RETAILER', 'retailer-uuid');
    expect(retView.twin_code).toBeUndefined();

    const consumerView = buildTwinView(sampleTwin, [], 'CONSUMER', 'consumer-riya-uuid');
    expect(consumerView.twin_code).toBeUndefined();
  });

  it('masks retailer organization from CONSUMER viewers', () => {
    const consumerView = buildTwinView(sampleTwin, [], 'CONSUMER', 'consumer-riya-uuid');
    expect(consumerView.current_retailer).toBeNull();

    const mfrView = buildTwinView(sampleTwin, [], 'MANUFACTURER', 'maker-uuid');
    expect(mfrView.current_retailer?.organization_name).toBe('TimeHouse Luxury');
  });

  it('masks owner personal details from other consumers', () => {
    // Riya viewing her own twin
    const riyaView = buildTwinView(sampleTwin, [], 'CONSUMER', 'consumer-riya-uuid');
    expect(riyaView.owner?.full_name).toBe('Riya Sharma');
    expect(riyaView.owner?.user_id).toBe('consumer-riya-uuid');

    // Arjun (another consumer) viewing Riya\'s twin
    const arjunView = buildTwinView(sampleTwin, [], 'CONSUMER', 'consumer-arjun-uuid');
    expect(arjunView.owner).toBeNull();
  });

  it('masks CONSUMER actor names and user IDs in timeline for consumer viewers', () => {
    const consumerTimeline = buildTwinView(sampleTwin, sampleEvents, 'CONSUMER', 'consumer-riya-uuid').timeline;

    // Event 1 (Manufacturer) shows Org
    expect(consumerTimeline[0].display).toBe('Aurelia Watches');

    // Event 2 (Retailer) shows Org
    expect(consumerTimeline[1].display).toBe('TimeHouse Luxury');

    // Event 3 (Consumer RESOLD) is masked as "Previous owner" with user_id: null
    expect(consumerTimeline[2].display).toBe('Previous owner');
    expect(consumerTimeline[2].user_id).toBeNull();

    // But manufacturer sees the real name and user ID
    const mfrTimeline = buildTwinView(sampleTwin, sampleEvents, 'MANUFACTURER', 'maker-uuid').timeline;
    expect(mfrTimeline[2].display).toBe('Arjun Verma');
    expect(mfrTimeline[2].user_id).toBe('consumer-arjun-uuid');
  });

  it('computes exact allowed_actions matrix strictly per contract', () => {
    // Manufacturer always has APPEND_EVENT
    expect(computeAllowedActions(sampleTwin, 'MANUFACTURER', 'maker-uuid')).toEqual(['APPEND_EVENT']);

    // Retailer in IN_TRANSIT
    expect(
      computeAllowedActions(
        { status: 'IN_TRANSIT', current_retailer_id: 'ret-1' },
        'RETAILER',
        'ret-1',
      ),
    ).toEqual(['RECEIVE']);

    // Retailer in IN_RETAIL
    expect(
      computeAllowedActions(
        { status: 'IN_RETAIL', current_retailer_id: 'ret-1' },
        'RETAILER',
        'ret-1',
      ),
    ).toEqual(['INSPECT', 'SELL']);

    // Consumer owner of SOLD item
    expect(
      computeAllowedActions(
        { status: 'SOLD', current_owner_id: 'owner-1' },
        'CONSUMER',
        'owner-1',
      ),
    ).toEqual(['INITIATE_TRANSFER']);

    // Unassigned retailer or non-owner consumer
    expect(
      computeAllowedActions(
        { status: 'SOLD', current_owner_id: 'owner-1' },
        'CONSUMER',
        'stranger-2',
      ),
    ).toEqual([]);
  });
});

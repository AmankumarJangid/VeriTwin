import { describe, it, expect } from 'vitest';

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
    allowedRoles: ['RETAILER'],
  },
  RESOLD: {
    fromStatus: ['SOLD'],
    toStatus: 'SOLD',
    allowedRoles: ['CONSUMER'],
  },
};

function canTransition(
  currentStatus: TwinStatus,
  event: EventType,
  role: string,
): { allowed: boolean; newStatus?: TwinStatus; reason?: string } {
  const rule = TRANSITIONS[event];
  if (!rule) return { allowed: false, reason: 'UNKNOWN_EVENT' };

  if (!rule.allowedRoles.includes(role)) {
    return { allowed: false, reason: 'ROLE_FORBIDDEN' };
  }

  if (rule.fromStatus.length > 0 && !rule.fromStatus.includes(currentStatus)) {
    return { allowed: false, reason: 'INVALID_STATE_TRANSITION' };
  }

  return { allowed: true, newStatus: rule.toStatus };
}

describe('Special Unit Test: Twin Lifecycle State Machine', () => {
  it('allows genesis event MANUFACTURED by MANUFACTURER only', () => {
    const res = canTransition('MANUFACTURED', 'MANUFACTURED', 'MANUFACTURER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('MANUFACTURED');

    const invalidRole = canTransition('MANUFACTURED', 'MANUFACTURED', 'CONSUMER');
    expect(invalidRole.allowed).toBe(false);
    expect(invalidRole.reason).toBe('ROLE_FORBIDDEN');
  });

  it('allows QA_PASSED from MANUFACTURED by MANUFACTURER only', () => {
    const res = canTransition('MANUFACTURED', 'QA_PASSED', 'MANUFACTURER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('QA_PASSED');

    // Cannot QA_PASS from IN_RETAIL
    const invalidState = canTransition('IN_RETAIL', 'QA_PASSED', 'MANUFACTURER');
    expect(invalidState.allowed).toBe(false);
    expect(invalidState.reason).toBe('INVALID_STATE_TRANSITION');
  });

  it('allows DISPATCHED_TO_RETAIL from QA_PASSED by MANUFACTURER', () => {
    const res = canTransition('QA_PASSED', 'DISPATCHED_TO_RETAIL', 'MANUFACTURER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('IN_TRANSIT');

    // Retailer cannot dispatch
    const retailerAttempt = canTransition('QA_PASSED', 'DISPATCHED_TO_RETAIL', 'RETAILER');
    expect(retailerAttempt.allowed).toBe(false);
  });

  it('allows RECEIVED_AT_RETAIL from IN_TRANSIT by RETAILER', () => {
    const res = canTransition('IN_TRANSIT', 'RECEIVED_AT_RETAIL', 'RETAILER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('IN_RETAIL');

    // Cannot receive if still MANUFACTURED
    const badState = canTransition('MANUFACTURED', 'RECEIVED_AT_RETAIL', 'RETAILER');
    expect(badState.allowed).toBe(false);
  });

  it('allows INSPECTED in IN_RETAIL by RETAILER without changing status', () => {
    const res = canTransition('IN_RETAIL', 'INSPECTED', 'RETAILER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('IN_RETAIL');
  });

  it('allows FIRST_SALE from IN_RETAIL by RETAILER leading to SOLD status', () => {
    const res = canTransition('IN_RETAIL', 'FIRST_SALE', 'RETAILER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('SOLD');

    // Consumer cannot trigger FIRST_SALE
    const consumerAttempt = canTransition('IN_RETAIL', 'FIRST_SALE', 'CONSUMER');
    expect(consumerAttempt.allowed).toBe(false);
  });

  it('allows RESOLD from SOLD by CONSUMER (status remains SOLD, owner updates)', () => {
    const res = canTransition('SOLD', 'RESOLD', 'CONSUMER');
    expect(res.allowed).toBe(true);
    expect(res.newStatus).toBe('SOLD');

    // Cannot RESOLD a twin that is not yet SOLD
    const badState = canTransition('IN_RETAIL', 'RESOLD', 'CONSUMER');
    expect(badState.allowed).toBe(false);
  });
});

// Formatting helpers for VeriTwin UI
import { TwinStatus, LifecycleEventType } from '../types/api';
import { colors } from '../theme/colors';

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(isoString);
}

export function getStatusDetails(status: TwinStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'MANUFACTURED':
      return { label: 'Manufactured', color: colors.statusManufactured, bg: '#f3f4f6' };
    case 'QA_PASSED':
      return { label: 'QA Passed', color: colors.statusQaPassed, bg: '#eff6ff' };
    case 'IN_TRANSIT':
      return { label: 'In Transit', color: colors.statusInTransit, bg: '#f5f3ff' };
    case 'IN_RETAIL':
      return { label: 'In Store', color: colors.statusInRetail, bg: '#f0fdfa' };
    case 'SOLD':
      return { label: 'Sold / Owned', color: colors.statusSold, bg: '#f0fdf4' };
    default:
      return { label: status, color: colors.inkMuted, bg: colors.surface2 };
  }
}

export function getEventTypeLabel(eventType: LifecycleEventType): string {
  switch (eventType) {
    case 'MANUFACTURED':
      return 'Unit Created & Watermarked';
    case 'QA_PASSED':
      return 'Factory QA Inspection Passed';
    case 'DISPATCHED_TO_RETAIL':
      return 'Dispatched to Retailer';
    case 'RECEIVED_AT_RETAIL':
      return 'Received at Retail Store';
    case 'INSPECTED':
      return 'Store Inspection Logged';
    case 'FIRST_SALE':
      return 'First-Hand Retail Sale';
    case 'RESOLD':
      return 'P2P Ownership Transfer';
    default:
      return eventType;
  }
}

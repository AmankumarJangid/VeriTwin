// Error message mapping per 02_FRONTEND.md §6.5
import { ApiError, ErrorCode } from '../types/api';

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'TOKEN_EXPIRED':
      case 'UNAUTHENTICATED':
        return 'Session expired, please log in.';
      case 'FORBIDDEN':
        return "You don't have permission for that.";
      case 'NOT_ASSIGNED':
        return "This item isn't assigned to your store.";
      case 'NOT_OWNER':
        return "You don't own this item.";
      case 'INVALID_STATE_TRANSITION':
        return err.details?.current_status
          ? `That step isn't allowed right now (current status: ${err.details.current_status}).`
          : "That state transition isn't permitted.";
      case 'TRANSFER_EXPIRED':
        return 'This transfer QR has expired. Ask the seller to generate a new one.';
      case 'TRANSFER_ALREADY_USED':
        return 'This transfer was already used or cancelled.';
      case 'CANNOT_CLAIM_OWN':
        return "You can't claim your own item.";
      case 'INVALID_QR_FORMAT':
        if (err.details?.hint === 'TRANSFER_QR') {
          return "That's a transfer QR — use the 'Scan Transfer' tab to claim it.";
        }
        return "That isn't a valid VeriTwin QR code.";
      case 'WATERMARK_LOW_CONFIDENCE':
        return err.message || "We couldn't read the hidden logo mark reliably. Try better lighting or switch to QR.";
      case 'IMAGE_SERVICE_UNAVAILABLE':
        return 'Logo scanning is temporarily unavailable. Please use QR scan.';
      case 'RATE_LIMITED':
        return 'Too many attempts. Please wait a moment.';
      case 'VALIDATION_ERROR':
        if (Array.isArray(err.details?.fields) && err.details.fields.length > 0) {
          return err.details.fields.map((f: any) => `${f.field}: ${f.message}`).join(', ');
        }
        return err.message || 'Validation error.';
      case 'CONFLICT':
        return err.message || 'A conflict occurred with an existing record.';
      case 'NOT_FOUND':
        return err.message || 'Requested item was not found.';
      default:
        return err.message || 'An unexpected error occurred.';
    }
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as any).message);
    if (msg.includes('Network Error') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return "Can't reach server. Check Wi-Fi and API URL.";
    }
    return msg;
  }

  return 'An unexpected error occurred.';
}

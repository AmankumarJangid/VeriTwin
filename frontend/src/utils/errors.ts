import { ErrorCode } from '../types/api';

export class ApiError extends Error {
  public code: ErrorCode | string;
  public details?: Record<string, unknown>;
  public status?: number;

  constructor(message: string, code: ErrorCode | string = 'INTERNAL_ERROR', details?: Record<string, unknown>, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * Maps API Error Code to user-friendly UI message according to 02_FRONTEND.md §6.5
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TOKEN_EXPIRED':
      case 'UNAUTHENTICATED':
        return 'Session expired. Please log in again.';
      case 'FORBIDDEN':
        return "You don't have permission to perform this action.";
      case 'NOT_ASSIGNED':
        return "This product item is not assigned to your retail store.";
      case 'NOT_OWNER':
        return "You don't own this product item.";
      case 'INVALID_STATE_TRANSITION': {
        const current = (error.details?.current_status as string) || 'current state';
        return `That action is not allowed right now (current status: ${current}).`;
      }
      case 'TRANSFER_EXPIRED':
        return 'This transfer QR code has expired. Ask the seller to generate a new one.';
      case 'TRANSFER_ALREADY_USED':
        return 'This transfer was already completed or cancelled.';
      case 'CANNOT_CLAIM_OWN':
        return "You cannot claim an item you already own.";
      case 'INVALID_QR_FORMAT':
        if (error.details?.hint === 'TRANSFER_QR') {
          return "That's an ownership transfer QR code — please use 'Scan Transfer' instead.";
        }
        return "The scanned QR code is not a valid VeriTwin code.";
      case 'WATERMARK_LOW_CONFIDENCE':
        return error.message || "Couldn't read the logo watermark reliably. Please try better lighting or switch to QR scan.";
      case 'IMAGE_SERVICE_UNAVAILABLE':
        return 'Logo watermark scanning is temporarily unavailable. Please use QR verification.';
      case 'RATE_LIMITED':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'CONFLICT':
        return error.message || 'A conflicting record already exists.';
      case 'VALIDATION_ERROR':
        return error.message || 'Please check your inputs and try again.';
      default:
        return error.message || 'An error occurred during the operation.';
    }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg.includes('Network Error') || msg.includes('Failed to fetch') || msg.includes('getaddrinfo')) {
      return "Cannot reach the server. Please check your network connection and API URL.";
    }
    return msg;
  }

  return String(error);
}

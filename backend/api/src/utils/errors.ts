export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorEnvelope(err: AppError) {
  return {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
    },
  };
}

export function validationError(fields: unknown): AppError {
  return new AppError('VALIDATION_ERROR', 'Validation failed', 400, { fields });
}

export function unauthenticated(): AppError {
  return new AppError('UNAUTHENTICATED', 'Authentication required', 401);
}

export function tokenExpired(): AppError {
  return new AppError('TOKEN_EXPIRED', 'Token has expired', 401);
}

export function forbidden(msg?: string): AppError {
  return new AppError('FORBIDDEN', msg ?? 'Access denied', 403);
}

export function notAssigned(): AppError {
  return new AppError('NOT_ASSIGNED', 'Twin is not assigned to you', 403);
}

export function notOwner(): AppError {
  return new AppError('NOT_OWNER', 'You are not the owner of this twin', 403);
}

export function notFound(msg?: string): AppError {
  return new AppError('NOT_FOUND', msg ?? 'Resource not found', 404);
}

export function conflict(msg?: string): AppError {
  return new AppError('CONFLICT', msg ?? 'Resource already exists', 409);
}

export function invalidStateTransition(currentStatus: string, allowedFrom: string[]): AppError {
  return new AppError(
    'INVALID_STATE_TRANSITION',
    `Cannot transition from '${currentStatus}'. Allowed: ${allowedFrom.join(', ')}`,
    409,
    { current_status: currentStatus, allowed_from: allowedFrom },
  );
}

export function cannotClaimOwn(): AppError {
  return new AppError('CANNOT_CLAIM_OWN', 'Cannot claim your own transfer token', 400);
}

export function transferInvalid(): AppError {
  return new AppError('TRANSFER_INVALID', 'Invalid transfer token', 404);
}

export function transferAlreadyUsed(): AppError {
  return new AppError('TRANSFER_ALREADY_USED', 'Transfer token already claimed or cancelled', 409);
}

export function transferExpired(): AppError {
  return new AppError('TRANSFER_EXPIRED', 'Transfer token has expired', 410);
}

export function payloadTooLarge(msg?: string): AppError {
  return new AppError('PAYLOAD_TOO_LARGE', msg ?? 'Payload too large', 413);
}

export function unsupportedMediaType(msg?: string): AppError {
  return new AppError('UNSUPPORTED_MEDIA_TYPE', msg ?? 'Unsupported media type', 415);
}

export function watermarkLowConfidence(details: unknown): AppError {
  return new AppError(
    'WATERMARK_LOW_CONFIDENCE',
    "We couldn't read the hidden logo mark reliably. Try better lighting or scan the QR code instead.",
    422,
    details,
  );
}

export function invalidQrFormat(details?: unknown): AppError {
  return new AppError('INVALID_QR_FORMAT', 'Invalid QR code format', 422, details);
}

export function imageServiceUnavailable(msg?: string): AppError {
  return new AppError('IMAGE_SERVICE_UNAVAILABLE', msg ?? 'Image service unavailable', 503);
}

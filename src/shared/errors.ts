export type ErrorMeta = Record<string, unknown>;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;
  readonly meta?: ErrorMeta;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { expose?: boolean; meta?: ErrorMeta; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = options?.expose ?? statusCode < 500;
    this.meta = options?.meta;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, meta?: ErrorMeta) {
    super(400, 'VALIDATION_ERROR', message, { meta });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, meta?: ErrorMeta) {
    super(409, 'CONFLICT', message, { meta });
    this.name = 'ConflictError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string, meta?: ErrorMeta, cause?: unknown) {
    super(502, 'PAYMENT_FAILED', message, { meta, cause, expose: true });
    this.name = 'PaymentError';
  }
}

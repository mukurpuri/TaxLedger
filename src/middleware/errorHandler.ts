import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.expose) {
      logger.error(err.message, {
        code: err.code,
        path: req.path,
        method: req.method,
        meta: err.meta,
      });
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.expose ? err.message : 'An unexpected error occurred',
        details: err.expose ? err.meta : undefined,
      },
    });
    return;
  }

  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : String(err),
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${req.path}`,
    },
  });
}

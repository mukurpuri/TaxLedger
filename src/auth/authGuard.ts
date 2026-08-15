import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
import { readBearerToken, verifySessionToken } from './session';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = readBearerToken(req.header('authorization'));
    if (!token) {
      throw new UnauthorizedError('Missing Authorization bearer token');
    }
    req.user = verifySessionToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireUser(req: Request): { userId: string; role: UserRole } {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

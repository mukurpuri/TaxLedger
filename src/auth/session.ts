import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors';
import type { AuthUser } from '../shared/types';

const SALT_ROUNDS = 12;

type TokenPayload = {
  sub: string;
  role: UserRole;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function issueSessionToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'taxledger',
  });
}

export function verifySessionToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'taxledger' });
    if (typeof decoded !== 'object' || decoded === null || typeof decoded.sub !== 'string') {
      throw new UnauthorizedError('Invalid session token');
    }
    const role = (decoded as TokenPayload).role;
    if (role !== 'taxpayer' && role !== 'ca' && role !== 'admin') {
      throw new UnauthorizedError('Invalid session token');
    }
    return { userId: decoded.sub, role };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired session');
  }
}

export function readBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/client';
import { ConflictError, UnauthorizedError, ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';
import { LoginRequestSchema, RegisterRequestSchema } from '../shared/schemas';
import type { PublicUser } from '../shared/types';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireUser } from './authGuard';
import { hashPassword, issueSessionToken, verifyPassword } from './session';

export const authRouter = Router();

function toPublicUser(user: {
  id: string;
  email: string;
  pan: string;
  name: string;
  role: PublicUser['role'];
  defaultTaxRegime: PublicUser['defaultTaxRegime'];
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    pan: user.pan,
    name: user.name,
    role: user.role,
    defaultTaxRegime: user.defaultTaxRegime,
    createdAt: user.createdAt,
  };
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = RegisterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration payload', {
        issues: parsed.error.flatten(),
      });
    }

    const { email, password, name, pan, role, defaultTaxRegime } = parsed.data;
    if (role !== 'taxpayer') {
      throw new ValidationError('Self-registration is limited to taxpayer accounts');
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, passwordHash, name, pan, role, defaultTaxRegime },
      });
      const token = issueSessionToken(user.id, user.role);
      logger.info('User registered', { userId: user.id, pan: user.pan });
      res.status(201).json({ token, user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('An account with this email or PAN already exists');
      }
      throw err;
    }
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid login payload', { issues: parsed.error.flatten() });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }
      const matches = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!matches) {
        throw new UnauthorizedError('Invalid email or password');
      }
      const token = issueSessionToken(user.id, user.role);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      logger.error('Login failed', { email: parsed.data.email, err: String(err) });
      throw err;
    }
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = requireUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError('Session user no longer exists');
    }
    res.json({ user: toPublicUser(user) });
  }),
);

import { Router } from 'express';
import { requireAuth, requireUser } from '../auth/authGuard';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../shared/errors';
import { requireParam } from '../shared/http';
import { FilingRequestSchema } from '../shared/schemas';
import * as filingService from './filingService';

export const filingRouter = Router();

filingRouter.use(requireAuth);

filingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = FilingRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid filing payload', { issues: parsed.error.flatten() });
    }
    const { userId } = requireUser(req);
    const filing = await filingService.createFiling(userId, parsed.data);
    res.status(201).json({ filing });
  }),
);

filingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = requireUser(req);
    const filings = await filingService.listFilingsForUser(userId);
    res.json({ filings });
  }),
);

filingRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { userId } = requireUser(req);
    const filing = await filingService.getFilingForUser(requireParam(req.params.id, 'id'), userId);
    res.json({ filing });
  }),
);

filingRouter.patch(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const { userId } = requireUser(req);
    const filing = await filingService.submitFiling(requireParam(req.params.id, 'id'), userId);
    res.json({ filing });
  }),
);

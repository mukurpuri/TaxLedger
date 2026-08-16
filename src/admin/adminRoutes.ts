import { Router } from 'express';
import { requireAuth } from '../auth/authGuard';
import { asyncHandler } from '../middleware/asyncHandler';
import { notifyFilingStatusChange } from '../notifications/notifier';
import { ValidationError } from '../shared/errors';
import { requireParam } from '../shared/http';
import { AdminStatusUpdateSchema } from '../shared/schemas';
import * as filingRepository from '../filing/filingRepository';

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get(
  '/filings',
  asyncHandler(async (_req, res) => {
    const filings = await filingRepository.listAllFilings();
    res.json({ filings: filings.map(filingRepository.toPublicFiling) });
  }),
);

adminRouter.get(
  '/filings/:id',
  asyncHandler(async (req, res) => {
    const filing = await filingRepository.getFiling(requireParam(req.params.id, 'id'));
    res.json({ filing: filingRepository.toPublicFiling(filing) });
  }),
);

adminRouter.patch(
  '/filings/:id/status',
  asyncHandler(async (req, res) => {
    const id = requireParam(req.params.id, 'id');
    const parsed = AdminStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid status payload', { issues: parsed.error.flatten() });
    }

    const existing = await filingRepository.getFiling(id);
    const extra =
      parsed.data.status === 'submitted' && !existing.submittedAt
        ? { submittedAt: new Date() }
        : undefined;
    const filing = await filingRepository.updateFilingStatus(id, parsed.data.status, extra);
    await notifyFilingStatusChange(filing.userId, filing);
    res.json({ filing: filingRepository.toPublicFiling(filing) });
  }),
);

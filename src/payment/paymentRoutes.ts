import { Router } from 'express';
import { requireAuth, requireUser } from '../auth/authGuard';
import { getFiling } from '../filing/filingRepository';
import { asyncHandler } from '../middleware/asyncHandler';
import { ForbiddenError, ValidationError } from '../shared/errors';
import { requireParam } from '../shared/http';
import { PaymentRequestSchema } from '../shared/schemas';
import { submitFilingPayment } from './paymentProcessor';
import * as paymentRepository from './paymentRepository';

export const paymentRouter = Router();

paymentRouter.post(
  '/filings/:id/payments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filing = await getFiling(requireParam(req.params.id, 'id'));
    const { userId } = requireUser(req);
    if (filing.userId !== userId) {
      throw new ForbiddenError('You cannot pay another taxpayer\'s filing');
    }

    const parsed = PaymentRequestSchema.safeParse({
      ...req.body,
      filingId: filing.id,
    });
    if (!parsed.success) {
      throw new ValidationError('Invalid payment payload', { issues: parsed.error.flatten() });
    }

    const gatewayReference = await submitFilingPayment(filing.id, parsed.data.amount);
    const payment = await paymentRepository.findSuccessfulPayment(filing.id);
    res.status(201).json({
      gatewayReference,
      payment: payment ? paymentRepository.toPublicPayment(payment) : null,
    });
  }),
);

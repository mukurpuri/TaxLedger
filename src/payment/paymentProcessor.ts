import { randomUUID } from 'node:crypto';
import { prisma } from '../db/client';
import { ConflictError, NotFoundError, ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';
import { rupeesToPaise, toNumber } from '../shared/utils';
import { generateInvoice } from './invoiceGenerator';
import { createCharge } from './paymentGateway';
import * as paymentRepository from './paymentRepository';

export async function submitFilingPayment(filingId: string, amount: number): Promise<string> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('Payment amount must be a positive number');
  }

  const filing = await prisma.filing.findUnique({
    where: { id: filingId },
    include: { user: true },
  });
  if (!filing) {
    throw new NotFoundError('Filing not found');
  }
  if (filing.status !== 'draft') {
    throw new ConflictError('Payments are only accepted against draft filings');
  }

  const taxDue = toNumber(filing.computedTax);
  if (Math.abs(amount - taxDue) > 0.009) {
    throw new ValidationError(
      `Payment amount ${amount} does not match computed tax ${taxDue} for this filing`,
    );
  }

  const existing = await paymentRepository.findSuccessfulPayment(filingId);
  if (existing) {
    throw new ConflictError('This filing has already been paid', {
      gatewayReference: existing.gatewayReference,
    });
  }

  const pendingReference = `pending_${randomUUID()}`;
  const payment = await paymentRepository.createPayment({
    filingId,
    amount,
    gatewayReference: pendingReference,
    status: 'pending',
  });

  const charge = await createCharge({
    amountPaise: rupeesToPaise(amount),
    currency: 'INR',
    orderId: `filing-${filing.id}`,
    description: `Self-assessment tax AY ${filing.assessmentYear}`,
    customerEmail: filing.user.email,
  });

  const invoiceText = generateInvoice(filing, {
    ...payment,
    gatewayReference: charge.id,
    status: 'success',
  });

  const updated = await paymentRepository.updatePayment(payment.id, {
    status: 'success',
    gatewayReference: charge.id,
    invoiceText,
    failureReason: null,
  });

  logger.info('Filing payment captured', {
    filingId,
    paymentId: updated.id,
    gatewayReference: charge.id,
  });

  return charge.id;
}

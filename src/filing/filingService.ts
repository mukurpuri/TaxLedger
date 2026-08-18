import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../shared/errors';
import type { FilingRequest, PublicFiling } from '../shared/types';
import { toNumber } from '../shared/utils';
import { calculateFinalTax } from '../tax/taxCalculator';
import { notifyFilingStatusChange } from '../notifications/notifier';
import * as paymentRepository from '../payment/paymentRepository';
import * as filingRepository from './filingRepository';

export async function createFiling(userId: string, input: FilingRequest): Promise<PublicFiling> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Taxpayer not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { defaultTaxRegime: input.taxRegime },
    });

    const computedTax = await calculateFinalTax(input.grossIncome, userId, input.assessmentYear);

    const filing = await filingRepository.createFiling({
      userId,
      assessmentYear: input.assessmentYear,
      grossIncome: input.grossIncome,
      taxRegime: input.taxRegime,
      computedTax,
    });

    return filingRepository.toPublicFiling(filing);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(
        `A filing already exists for assessment year ${input.assessmentYear}`,
      );
    }
    throw err;
  }
}

export async function getFilingForUser(filingId: string, userId: string): Promise<PublicFiling> {
  try {
    const filing = await filingRepository.getFiling(filingId);
    if (filing.userId !== userId) {
      throw new ForbiddenError('You cannot access another taxpayer\'s filing');
    }
    return filingRepository.toPublicFiling(filing);
  } catch (err) {
    throw err;
  }
}

export async function listFilingsForUser(userId: string): Promise<PublicFiling[]> {
  try {
    const filings = await filingRepository.listFilingsForUser(userId);
    return filings.map(filingRepository.toPublicFiling);
  } catch (err) {
    throw err;
  }
}

export async function submitFiling(filingId: string, userId: string): Promise<PublicFiling> {
  try {
    const filing = await filingRepository.getFiling(filingId);
    if (filing.userId !== userId) {
      throw new ForbiddenError('You cannot submit another taxpayer\'s filing');
    }
    if (filing.status !== 'draft') {
      throw new ConflictError(`Filing is already ${filing.status} and cannot be submitted again`);
    }

    const taxDue = toNumber(filing.computedTax);
    if (taxDue > 0) {
      const successful = await paymentRepository.findSuccessfulPayment(filing.id);
      if (!successful) {
        throw new ValidationError('Tax due must be paid before the return can be submitted');
      }
    }

    const updated = await filingRepository.updateFilingStatus(filing.id, 'submitted', {
      submittedAt: new Date(),
    });
    notifyFilingStatusChange(userId, updated);
    return filingRepository.toPublicFiling(updated);
  } catch (err) {
    throw err;
  }
}

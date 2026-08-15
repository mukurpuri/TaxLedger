import type { Filing, FilingStatus, Prisma, TaxRegime } from '@prisma/client';
import { prisma } from '../db/client';
import { NotFoundError } from '../shared/errors';
import type { PublicFiling } from '../shared/types';
import { toNumber } from '../shared/utils';

export type CreateFilingRecord = {
  userId: string;
  assessmentYear: string;
  grossIncome: number;
  taxRegime: TaxRegime;
  computedTax: number;
};

export async function createFiling(data: CreateFilingRecord): Promise<Filing> {
  try {
    return await prisma.filing.create({
      data: {
        userId: data.userId,
        assessmentYear: data.assessmentYear,
        grossIncome: data.grossIncome,
        taxRegime: data.taxRegime,
        computedTax: data.computedTax,
        status: 'draft',
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function getFiling(id: string): Promise<Filing> {
  try {
    const filing = await prisma.filing.findUnique({ where: { id } });
    if (!filing) {
      throw new NotFoundError('Filing not found');
    }
    return filing;
  } catch (err) {
    throw err;
  }
}

export async function updateFilingStatus(
  id: string,
  status: FilingStatus,
  extra?: Prisma.FilingUpdateInput,
): Promise<Filing> {
  try {
    await getFiling(id);
    return await prisma.filing.update({
      where: { id },
      data: {
        status,
        ...extra,
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function listFilingsForUser(userId: string): Promise<Filing[]> {
  try {
    return await prisma.filing.findMany({
      where: { userId },
      orderBy: [{ assessmentYear: 'desc' }, { createdAt: 'desc' }],
    });
  } catch (err) {
    throw err;
  }
}

export async function listAllFilings(): Promise<Filing[]> {
  try {
    return await prisma.filing.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
  } catch (err) {
    throw err;
  }
}

export function toPublicFiling(filing: Filing): PublicFiling {
  return {
    id: filing.id,
    userId: filing.userId,
    assessmentYear: filing.assessmentYear,
    grossIncome: toNumber(filing.grossIncome),
    taxRegime: filing.taxRegime,
    status: filing.status,
    computedTax: toNumber(filing.computedTax),
    submittedAt: filing.submittedAt,
    createdAt: filing.createdAt,
    updatedAt: filing.updatedAt,
  };
}

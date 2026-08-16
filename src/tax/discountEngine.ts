import type { TaxRegime } from '@prisma/client';
import { prisma } from '../db/client';
import { NotFoundError } from '../shared/errors';
import { roundCurrency } from '../shared/utils';
import { getTaxCalculationContext } from './calculationContext';

const NEW_REGIME_87A_LIMIT = 700_000;
const OLD_REGIME_87A_LIMIT = 500_000;
const OLD_REGIME_87A_MAX = 12_500;

export async function applyEligibleDiscount(baseTax: number, taxpayerId: string): Promise<number> {
  try {
    if (!Number.isFinite(baseTax) || baseTax < 0) {
      throw new Error('baseTax must be a non-negative finite number');
    }

    const user = await prisma.user.findUnique({ where: { id: taxpayerId } });
    if (!user) {
      throw new NotFoundError('Taxpayer not found');
    }

    const context = getTaxCalculationContext();
    const grossIncome = context?.grossIncome;
    const regime: TaxRegime = context?.regime ?? user.defaultTaxRegime;

    if (grossIncome === undefined) {
      return roundCurrency(baseTax);
    }

    if (regime === 'new') {
      return roundCurrency(applySection87ANewRegime(baseTax, grossIncome));
    }

    return roundCurrency(applySection87AOldRegime(baseTax, grossIncome));
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    throw err;
  }
}

function applySection87ANewRegime(baseTax: number, totalIncome: number): number {
  if (totalIncome <= NEW_REGIME_87A_LIMIT) {
    return 0;
  }

  const incomeAboveLimit = totalIncome - NEW_REGIME_87A_LIMIT;
  return Math.min(baseTax, incomeAboveLimit);
}

function applySection87AOldRegime(baseTax: number, totalIncome: number): number {
  if (totalIncome > OLD_REGIME_87A_LIMIT) {
    return baseTax;
  }
  return Math.max(0, baseTax - OLD_REGIME_87A_MAX);
}

import type { TaxRegime } from '@prisma/client';
import { prisma } from '../db/client';
import { AppError, NotFoundError, ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';
import type { TaxBreakdown } from '../shared/types';
import { roundCurrency, toNumber } from '../shared/utils';
import { taxCalculationStore } from './calculationContext';
import { applyEligibleDiscount } from './discountEngine';

const CESS_RATE = 0.04;

type SlabRow = {
  incomeFrom: { toString(): string };
  incomeTo: { toString(): string } | null;
  ratePercent: { toString(): string };
};

export async function calculateFinalTax(
  grossIncome: number,
  taxpayerId: string,
  assessmentYear: string,
): Promise<number> {
  const breakdown = await calculateTaxBreakdown(grossIncome, taxpayerId, assessmentYear);
  return breakdown.finalTax;
}

export async function calculateTaxBreakdown(
  grossIncome: number,
  taxpayerId: string,
  assessmentYear: string,
  regimeOverride?: TaxRegime,
): Promise<TaxBreakdown> {
  try {
    if (!Number.isFinite(grossIncome) || grossIncome <= 0) {
      throw new ValidationError('grossIncome must be a positive number');
    }

    const user = await prisma.user.findUnique({ where: { id: taxpayerId } });
    if (!user) {
      throw new NotFoundError('Taxpayer not found');
    }

    const regime = regimeOverride ?? user.defaultTaxRegime;
    const slabs = await prisma.taxSlab.findMany({
      where: { regime, assessmentYear },
      orderBy: { incomeFrom: 'asc' },
    });

    if (slabs.length === 0) {
      throw new AppError(
        400,
        'TAX_SLABS_MISSING',
        `No tax slabs configured for ${regime} regime, AY ${assessmentYear}`,
      );
    }

    return await taxCalculationStore.run(
      { taxpayerId, grossIncome, assessmentYear, regime },
      async () => {
        const slabTax = computeProgressiveTax(grossIncome, slabs);
        const afterRebate = await applyEligibleDiscount(slabTax, taxpayerId);
        const rebate87A = roundCurrency(slabTax - afterRebate);
        const surcharge = computeSurcharge(afterRebate, grossIncome, regime);
        const taxBeforeCess = roundCurrency(afterRebate + surcharge);
        const cess = roundCurrency(taxBeforeCess * CESS_RATE);
        const finalTax = roundCurrency(taxBeforeCess + cess);

        return {
          grossIncome,
          assessmentYear,
          regime,
          slabTax: roundCurrency(slabTax),
          rebate87A,
          surcharge: roundCurrency(surcharge),
          cess,
          finalTax,
        };
      },
    );
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    logger.error('Tax calculation failed', {
      taxpayerId,
      assessmentYear,
      err: err instanceof Error ? err.message : String(err),
    });
    throw new AppError(500, 'TAX_CALCULATION_FAILED', 'Failed to calculate tax', { cause: err });
  }
}

export function computeProgressiveTax(income: number, slabs: SlabRow[]): number {
  const ordered = [...slabs].sort((a, b) => toNumber(a.incomeFrom) - toNumber(b.incomeFrom));
  let tax = 0;

  for (const slab of ordered) {
    const from = toNumber(slab.incomeFrom);
    const to = slab.incomeTo === null ? Number.POSITIVE_INFINITY : toNumber(slab.incomeTo);
    const rate = toNumber(slab.ratePercent) / 100;

    if (income <= from) {
      continue;
    }

    const taxableInSlab = Math.min(income, to) - from;
    if (taxableInSlab > 0) {
      tax += taxableInSlab * rate;
    }
  }

  return tax;
}

function computeSurcharge(taxAfterRebate: number, totalIncome: number, regime: TaxRegime): number {
  if (taxAfterRebate <= 0) {
    return 0;
  }

  const rate = surchargeRate(totalIncome, regime);
  if (rate === 0) {
    return 0;
  }

  const surcharge = taxAfterRebate * rate;
  return applySurchargeMarginalRelief(taxAfterRebate, surcharge, totalIncome, regime);
}

function surchargeRate(totalIncome: number, regime: TaxRegime): number {
  if (totalIncome <= 5_000_000) {
    return 0;
  }
  if (totalIncome <= 10_000_000) {
    return 0.1;
  }
  if (totalIncome <= 20_000_000) {
    return 0.15;
  }
  if (regime === 'new') {
    return 0.25;
  }
  if (totalIncome <= 50_000_000) {
    return 0.25;
  }
  return 0.37;
}

function applySurchargeMarginalRelief(
  taxAfterRebate: number,
  surcharge: number,
  totalIncome: number,
  regime: TaxRegime,
): number {
  const threshold = surchargeThreshold(totalIncome);
  if (threshold === null) {
    return surcharge;
  }

  const taxAtThreshold = taxAfterRebate; // already computed on actual income
  const extraIncome = totalIncome - threshold;
  const taxPlusSurcharge = taxAfterRebate + surcharge;
  const capped = taxAtThreshold + extraIncome;
  if (taxPlusSurcharge > capped) {
    const relieved = Math.max(0, capped - taxAfterRebate);
    logger.debug('Applied surcharge marginal relief', { regime, totalIncome, relieved });
    return relieved;
  }
  return surcharge;
}

function surchargeThreshold(totalIncome: number): number | null {
  if (totalIncome > 5_000_000 && totalIncome <= 5_000_000 + 1_000_000) {
    return 5_000_000;
  }
  return null;
}

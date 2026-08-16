import { AsyncLocalStorage } from 'node:async_hooks';
import type { TaxRegime } from '@prisma/client';
import { computeProgressiveTax } from './taxCalculator';

export type TaxCalculationContext = {
  taxpayerId: string;
  grossIncome: number;
  assessmentYear: string;
  regime: TaxRegime;
};

export const taxCalculationStore = new AsyncLocalStorage<TaxCalculationContext>();

export function getTaxCalculationContext(): TaxCalculationContext | undefined {
  return taxCalculationStore.getStore();
}

export function runBracketLookup(
  income: number,
  slabs: Parameters<typeof computeProgressiveTax>[1],
): number {
  return computeProgressiveTax(income, slabs);
}

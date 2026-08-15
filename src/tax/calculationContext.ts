import { AsyncLocalStorage } from 'node:async_hooks';
import type { TaxRegime } from '@prisma/client';

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

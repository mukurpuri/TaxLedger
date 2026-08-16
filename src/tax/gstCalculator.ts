import { ValidationError } from '../shared/errors';
import { roundCurrency } from '../shared/utils';

const GST_RATES: Record<string, number> = {
  exempt: 0,
  nil: 0,
  essential: 5,
  food_grains: 5,
  processed_food: 5,
  packaged_food: 12,
  computers: 12,
  apparel: 12,
  services: 18,
  software: 18,
  professional: 18,
  telecom: 18,
  standard: 18,
  luxury: 28,
  automobiles: 28,
  tobacco: 28,
  aerated_drinks: 28,
};

export function calculateGST(amount: number, category: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError('GST amount must be a non-negative finite number');
  }
  if (!category || typeof category !== 'string') {
    throw new ValidationError('GST category is required');
  }

  const key = category.trim().toLowerCase();
  const rate = GST_RATES[key];
  if (rate === undefined) {
    throw new ValidationError(
      `Unknown GST category "${category}". Valid categories: ${Object.keys(GST_RATES).join(', ')}`,
    );
  }

  return roundCurrency(amount * (rate / 100));
}

export function getGstRate(category: string): number {
  const key = category.trim().toLowerCase();
  const rate = GST_RATES[key];
  if (rate === undefined) {
    throw new ValidationError(`Unknown GST category "${category}"`);
  }
  return rate;
}

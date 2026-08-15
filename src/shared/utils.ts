const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error('formatINR requires a finite number');
  }
  return INR.format(amount);
}

export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('formatDateTime requires a valid date');
  }
  return DATE.format(date);
}

export function roundToRupee(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function paiseToRupees(paise: number): number {
  return roundToRupee(paise / 100);
}

export function toNumber(value: { toString(): string } | number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(parsed)) {
    throw new Error('Expected a finite numeric value');
  }
  return parsed;
}

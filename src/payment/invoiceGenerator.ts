import type { Filing, Payment } from '@prisma/client';
import { formatDateTime, formatINR, toNumber } from '../shared/utils';

export function generateInvoice(filing: Filing, payment: Payment): string {
  const amount = toNumber(payment.amount);
  const lines = [
    'TAXLEDGER TAX PAYMENT INVOICE',
    '================================',
    `Invoice ref : ${payment.gatewayReference}`,
    `Payment id  : ${payment.id}`,
    `Filing id   : ${filing.id}`,
    `Assessment  : AY ${filing.assessmentYear}`,
    `Regime      : ${filing.taxRegime}`,
    `Issued      : ${formatDateTime(payment.createdAt)}`,
    '--------------------------------',
    `Income-tax paid : ${formatINR(amount)}`,
    '================================',
    'This receipt confirms collection of self-assessment tax against the filing above.',
  ];
  return lines.join('\n');
}

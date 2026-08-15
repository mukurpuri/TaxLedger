import type { Payment, PaymentStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { NotFoundError } from '../shared/errors';
import type { PublicPayment } from '../shared/types';
import { toNumber } from '../shared/utils';

export async function createPayment(data: {
  filingId: string;
  amount: number;
  gatewayReference: string;
  status?: PaymentStatus;
}): Promise<Payment> {
  try {
    return await prisma.payment.create({
      data: {
        filingId: data.filingId,
        amount: data.amount,
        gatewayReference: data.gatewayReference,
        status: data.status ?? 'pending',
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function updatePayment(
  id: string,
  data: {
    status: PaymentStatus;
    gatewayReference?: string;
    invoiceText?: string;
    failureReason?: string | null;
  },
): Promise<Payment> {
  try {
    return await prisma.payment.update({
      where: { id },
      data,
    });
  } catch (err) {
    throw err;
  }
}

export async function getPayment(id: string): Promise<Payment> {
  try {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  } catch (err) {
    throw err;
  }
}

export async function listPaymentsForFiling(filingId: string): Promise<Payment[]> {
  try {
    return await prisma.payment.findMany({
      where: { filingId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    throw err;
  }
}

export async function findSuccessfulPayment(filingId: string): Promise<Payment | null> {
  try {
    return await prisma.payment.findFirst({
      where: { filingId, status: 'success' },
    });
  } catch (err) {
    throw err;
  }
}

export function toPublicPayment(payment: Payment): PublicPayment {
  return {
    id: payment.id,
    filingId: payment.filingId,
    amount: toNumber(payment.amount),
    gatewayReference: payment.gatewayReference,
    status: payment.status,
    invoiceText: payment.invoiceText,
    createdAt: payment.createdAt,
  };
}

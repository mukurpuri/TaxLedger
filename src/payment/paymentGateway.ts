import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../shared/logger';

export class PaymentGatewayError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PaymentGatewayError';
    this.code = code;
  }
}

export type ChargeRequest = {
  amountPaise: number;
  currency: 'INR';
  orderId: string;
  description: string;
  customerEmail?: string;
};

export type ChargeResponse = {
  id: string;
  status: 'captured';
  amountPaise: number;
  orderId: string;
};

function assertConfigured(): void {
  if (!env.PAYMENT_GATEWAY_KEY || env.PAYMENT_GATEWAY_KEY.length < 8) {
    throw new PaymentGatewayError('Payment gateway is not configured', 'GATEWAY_CONFIG');
  }
}

export async function createCharge(input: ChargeRequest): Promise<ChargeResponse> {
  assertConfigured();

  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new PaymentGatewayError(
      'Amount must be a positive integer number of paise',
      'INVALID_AMOUNT',
    );
  }
  if (!input.orderId || input.orderId.trim().length === 0) {
    throw new PaymentGatewayError('orderId is required', 'INVALID_ORDER');
  }
  if (input.currency !== 'INR') {
    throw new PaymentGatewayError('Only INR charges are supported', 'UNSUPPORTED_CURRENCY');
  }

  try {
    await delay(40);

    if (input.orderId.startsWith('fail-')) {
      throw new PaymentGatewayError('The issuing bank declined the charge', 'CARD_DECLINED');
    }
  } catch (err) {
    logger.error('Payment gateway charge failed', {
      orderId: input.orderId,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const response: ChargeResponse = {
    id: `ch_${randomUUID().replace(/-/g, '')}`,
    status: 'captured',
    amountPaise: input.amountPaise,
    orderId: input.orderId,
  };

  logger.info('Payment gateway captured charge', {
    gatewayReference: response.id,
    orderId: input.orderId,
    amountPaise: input.amountPaise,
  });

  return response;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

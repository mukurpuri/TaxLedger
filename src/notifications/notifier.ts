import type { Filing } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../shared/logger';
import { formatINR } from '../shared/utils';

export async function notifyFilingStatusChange(userId: string, filing: Filing): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.warn('Skipped filing status notification; user not found', {
        userId,
        filingId: filing.id,
      });
      return;
    }

    const subject = `TaxLedger: filing ${filing.id} is now ${filing.status}`;
    const body = [
      `Hello ${user.name},`,
      '',
      `Your income-tax filing for AY ${filing.assessmentYear} is now ${filing.status.replace('_', ' ')}.`,
      `Computed tax: ${formatINR(Number(filing.computedTax))}.`,
      filing.submittedAt ? `Submitted at: ${filing.submittedAt.toISOString()}.` : '',
      '',
      'This message would be delivered by email and SMS once a provider is configured.',
    ]
      .filter(Boolean)
      .join('\n');

    logger.info('Would send filing status notification', {
      channel: ['email', 'sms'],
      to: user.email,
      userId: user.id,
      filingId: filing.id,
      status: filing.status,
      subject,
      body,
    });
  } catch (err) {
    logger.error('Failed to enqueue filing status notification', {
      userId,
      filingId: filing.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

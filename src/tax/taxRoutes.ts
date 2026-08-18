import { Router } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireUser } from '../auth/authGuard';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, ValidationError } from '../shared/errors';
import { GstCalculateRequestSchema, TaxCalculateRequestSchema } from '../shared/schemas';
import { formatINR } from '../shared/utils';
import { calculateGST, getGstRate } from './gstCalculator';
import { calculateTaxBreakdown } from './taxCalculator';

export const taxRouter = Router();

taxRouter.post(
  '/calculate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = TaxCalculateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid tax calculation payload', {
        issues: parsed.error.flatten(),
      });
    }

    const { userId } = requireUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Taxpayer not found');
    }

    if (parsed.data.taxRegime && parsed.data.taxRegime !== user.defaultTaxRegime) {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultTaxRegime: parsed.data.taxRegime },
      });
    }

    const breakdown = await calculateTaxBreakdown(
      parsed.data.grossIncome,
      userId,
      parsed.data.assessmentYear,
      parsed.data.taxRegime,
    );

    res.json({
      ...breakdown,
      formattedTax: formatINR(breakdown.finalTax),
    });
  }),
);

taxRouter.post(
  '/gst',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = GstCalculateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid GST calculation payload', {
        issues: parsed.error.flatten(),
      });
    }

    const gst = calculateGST(parsed.data.category, parsed.data.amount);
    res.json({
      amount: parsed.data.amount,
      category: parsed.data.category,
      ratePercent: getGstRate(parsed.data.category),
      gst,
      total: parsed.data.amount + gst,
      formattedGst: formatINR(gst),
    });
  }),
);

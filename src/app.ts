import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { adminRouter } from './admin/adminRoutes';
import { authRouter } from './auth/authRoutes';
import { documentRouter } from './documents/uploadHandler';
import { filingRouter } from './filing/filingRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { paymentRouter } from './payment/paymentRoutes';
import { taxRouter } from './tax/taxRoutes';
import { calculateGST, getGstRate } from './tax/gstCalculator';
import { GstCalculateRequestSchema } from './shared/schemas';
import { ValidationError } from './shared/errors';
import { formatINR } from './shared/utils';
import { requireAuth } from './auth/authGuard';
import { asyncHandler } from './middleware/asyncHandler';
import { logger } from './shared/logger';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    logger.info('request', { method: req.method, path: req.path });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'taxledger' });
  });

  app.use('/auth', authRouter);
  app.use('/filings', filingRouter);
  app.use(paymentRouter);
  app.use(documentRouter);
  app.use('/tax', taxRouter);
  app.use('/admin', adminRouter);

  app.post(
    '/gst/calculate',
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = GstCalculateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid GST calculation payload', {
          issues: parsed.error.flatten(),
        });
      }
      const gst = calculateGST(parsed.data.amount, parsed.data.category);
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

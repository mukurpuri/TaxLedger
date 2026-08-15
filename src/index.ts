import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/client';
import { logger } from './shared/logger';

async function main(): Promise<void> {
  try {
    await prisma.$connect();
  } catch (err) {
    logger.error('Failed to connect to the database', {
      err: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info('TaxLedger API listening', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutting down', { signal });
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

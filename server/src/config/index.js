import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'editorial-workflow-default-secret-key-32chars',
  nodeEnv: process.env.NODE_ENV || 'development',
  cronSecret: process.env.CRON_SECRET || 'dispatch-internal-cron-secret-2026',
  enableSchedulerWorker: process.env.ENABLE_SCHEDULER_WORKER !== 'false',
  schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '30000', 10),
  schedulerBatchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50', 10),
};


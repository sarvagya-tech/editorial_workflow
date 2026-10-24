// server/src/controllers/cron.controller.js
import { processDueScheduledArticles, getSchedulerStatus } from '../workers/scheduler.worker.js';

/**
 * POST /api/internal/cron/publish
 * Triggered by external cron runners (Vercel Cron, GitHub Actions, AWS EventBridge, Render Cron)
 * or manual administrative triggers.
 */
export async function triggerScheduledPublish(req, res, next) {
  try {
    const batchSize = req.body?.batchSize ? parseInt(req.body.batchSize, 10) : undefined;
    const result = await processDueScheduledArticles({ batchSize });

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Controller] Unexpected error executing scheduled publishing trigger:', error.message);
    res.status(500).json({
      success: false,
      error: 'Scheduled publishing execution encountered an internal error.',
    });
  }
}

/**
 * GET /api/internal/cron/status
 * Operational health check and status reporting for the scheduled publishing subsystem.
 */
export function getStatus(req, res) {
  const status = getSchedulerStatus();
  res.status(200).json({
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  });
}

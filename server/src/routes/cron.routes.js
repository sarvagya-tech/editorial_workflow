import crypto from 'crypto';
import express from 'express';
import { config } from '../config/index.js';
import {
  processDueScheduledArticles,
  runSchedulerCycle,
  getSchedulerStatus,
} from '../workers/scheduler.worker.js';

const router = express.Router();

/**
 * Constant-time comparison helper to prevent timing attacks on cron secrets.
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware: Enforces cron secret authentication.
 * Accepts x-cron-secret header OR Authorization: Bearer <secret>.
 * Never logs or reveals the secret.
 */
export function requireCronSecret(req, res, next) {
  const secretHeader = req.headers['x-cron-secret'];
  let bearerToken = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    bearerToken = req.headers.authorization.slice(7).trim();
  }

  const providedSecret = secretHeader || bearerToken;

  if (!providedSecret || !secureCompare(providedSecret, config.cronSecret)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing cron secret credentials.',
    });
  }

  next();
}

/**
 * POST /api/internal/cron/publish
 * Triggered by external cron runners (Vercel Cron, GitHub Actions, AWS EventBridge, Render Cron)
 * or manual administrative triggers.
 */
router.post('/publish', requireCronSecret, async (req, res, next) => {
  try {
    const batchSize = req.body?.batchSize ? parseInt(req.body.batchSize, 10) : undefined;
    const result = await processDueScheduledArticles({ batchSize });

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron API] Unexpected error executing scheduled publishing trigger:', error.message);
    res.status(500).json({
      success: false,
      error: 'Scheduled publishing execution encountered an internal error.',
    });
  }
});

/**
 * GET /api/internal/cron/status
 * Operational health check and status reporting for the scheduled publishing subsystem.
 */
router.get('/status', requireCronSecret, (req, res) => {
  const status = getSchedulerStatus();
  res.status(200).json({
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  });
});

export default router;

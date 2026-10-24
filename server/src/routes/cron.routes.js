// server/src/routes/cron.routes.js
import crypto from 'crypto';
import express from 'express';
import { config } from '../config/index.js';
import * as cronController from '../controllers/cron.controller.js';

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

// Internal scheduled publisher cron endpoints
router.post('/publish', requireCronSecret, cronController.triggerScheduledPublish);
router.get('/status', requireCronSecret, cronController.getStatus);

export default router;

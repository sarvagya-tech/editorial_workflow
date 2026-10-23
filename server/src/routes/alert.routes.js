import { Router } from 'express';
import { authenticate, requireEditor } from '../middleware/auth.js';
import * as alertService from '../services/alert.service.js';

const router = Router();

// All alert endpoints require authentication
router.use(authenticate);

/**
 * GET /api/alerts/overdue
 * Retrieve active overdue scheduled article alerts for caller's role scope.
 */
async function handleGetOverdueAlerts(req, res, next) {
  try {
    const result = await alertService.getOverdueAlerts({ user: req.user });
    res.status(200).json({
      success: true,
      data: result.alerts,
      alerts: result.alerts,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}

router.get('/overdue', handleGetOverdueAlerts);
router.get('/', handleGetOverdueAlerts);

/**
 * GET /api/alerts/count
 * Retrieve fast count of active overdue alerts.
 */
router.get('/count', async (req, res, next) => {
  try {
    const result = await alertService.getOverdueAlerts({ user: req.user });
    res.status(200).json({
      success: true,
      count: result.total,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alerts/:id/dismiss
 * Dismiss overdue alert for the specified article ID.
 */
router.post('/:id/dismiss', requireEditor, async (req, res, next) => {
  try {
    const result = await alertService.dismissOverdueAlert({
      articleId: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

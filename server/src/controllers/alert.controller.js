// server/src/controllers/alert.controller.js
import * as alertService from '../services/alert.service.js';

/**
 * GET /api/alerts/overdue
 * Retrieve active overdue scheduled article alerts for caller's role scope.
 */
export async function getOverdueAlerts(req, res, next) {
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

/**
 * GET /api/alerts/count
 * Retrieve fast count of active overdue alerts.
 */
export async function getOverdueAlertsCount(req, res, next) {
  try {
    const result = await alertService.getOverdueAlerts({ user: req.user });
    res.status(200).json({
      success: true,
      count: result.total,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/alerts/:id/dismiss
 * Dismiss overdue alert for the specified article ID.
 */
export async function dismissOverdueAlert(req, res, next) {
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
}

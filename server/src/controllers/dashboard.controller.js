// server/src/controllers/dashboard.controller.js
import * as dashboardService from '../services/dashboard.service.js';

/**
 * GET /api/dashboard
 * Retrieve high-level editorial metrics, status & section breakdowns, and 8-week publication trend.
 */
export async function getDashboardMetrics(req, res, next) {
  try {
    const metrics = await dashboardService.getDashboardMetrics({ user: req.user });
    res.status(200).json({
      success: true,
      data: metrics,
      summary: metrics.summary,
      byStatus: metrics.byStatus,
      bySection: metrics.bySection,
      weeklyPublications: metrics.weeklyPublications,
    });
  } catch (error) {
    next(error);
  }
}

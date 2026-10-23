import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as calendarService from '../services/calendar.service.js';

const router = Router();

// All calendar endpoints require authentication
router.use(authenticate);

/**
 * GET /api/calendar/export.csv
 * Export scheduled and published articles as a secure, sanitized CSV file.
 */
async function handleExportCsv(req, res, next) {
  try {
    const { from, to, sectionId } = req.query;
    const csvData = await calendarService.exportCalendarCsv({
      from,
      to,
      sectionId,
      user: req.user,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="editorial-calendar.csv"');
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

router.get('/export.csv', handleExportCsv);
router.get('/export', handleExportCsv);

export default router;

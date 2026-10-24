// server/src/controllers/calendar.controller.js
import * as calendarService from '../services/calendar.service.js';

/**
 * GET /api/calendar
 * Retrieve scheduled and published articles within a date range for editorial calendar.
 */
export async function getCalendarArticles(req, res, next) {
  try {
    const { from, to, sectionId } = req.query;
    const articles = await calendarService.getCalendarArticles({
      from,
      to,
      sectionId,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/calendar/export.csv
 * Export scheduled and published articles as a secure, sanitized CSV file.
 */
export async function exportCalendarCsv(req, res, next) {
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

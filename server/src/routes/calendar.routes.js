// server/src/routes/calendar.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as calendarController from '../controllers/calendar.controller.js';

const router = Router();

// All calendar endpoints require authentication
router.use(authenticate);

router.get('/', calendarController.getCalendarArticles);
router.get('/export.csv', calendarController.exportCalendarCsv);
router.get('/export', calendarController.exportCalendarCsv);

export default router;

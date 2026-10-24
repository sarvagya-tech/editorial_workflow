// server/src/routes/alert.routes.js
import { Router } from 'express';
import { authenticate, requireEditor } from '../middleware/auth.js';
import * as alertController from '../controllers/alert.controller.js';

const router = Router();

// All alert endpoints require authentication
router.use(authenticate);

// Overdue alert feeds
router.get('/overdue', alertController.getOverdueAlerts);
router.get('/', alertController.getOverdueAlerts);
router.get('/count', alertController.getOverdueAlertsCount);

// Alert dismissal
router.post('/:id/dismiss', requireEditor, alertController.dismissOverdueAlert);

export default router;

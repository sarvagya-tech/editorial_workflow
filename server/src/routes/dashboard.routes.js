// server/src/routes/dashboard.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

router.get('/', dashboardController.getDashboardMetrics);

export default router;

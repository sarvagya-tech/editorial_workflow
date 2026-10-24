// server/src/routes/auth.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Public authentication routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/demo-accounts', authController.getDemoAccounts);
router.post('/logout', authController.logout);

// Authenticated session route
router.get('/me', authenticate, authController.getProfile);

export default router;

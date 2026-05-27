import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// GET /api/analytics/summary — protected, requires valid user JWT token
router.get('/summary', authenticate, analyticsController.getSummary);

export default router;

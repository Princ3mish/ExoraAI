import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { authenticate } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const router = Router();

/**
 * Phase 3: Auth Routes
 * POST /api/auth/register — public, creates a new user account (hashed password)
 * POST /api/auth/login    — public, validates credentials and returns JWT
 * GET  /api/auth/me       — protected, returns current user profile
 */
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const router = Router();

/**
 * Phase 3: Auth Routes
 * POST /api/auth/register — public, creates a new user account (hashed password)
 * POST /api/auth/login    — public, validates credentials and returns JWT
 */
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);

export default router;

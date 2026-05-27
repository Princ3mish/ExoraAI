import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { authenticate } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const router = Router();

/**
 * Phase 3: Auth Routes
 * POST /api/auth/register              — public
 * POST /api/auth/login                 — public
 * GET  /api/auth/me                    — protected
 * POST /api/auth/change-password       — protected
 * GET  /api/auth/telegram-token        — protected, Phase S1
 * GET  /api/auth/telegram-status       — protected, Phase S1
 */
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);

// Phase S1 — Telegram account linking
router.get('/telegram-token', authenticate, authController.telegramToken);
router.get('/telegram-status', authenticate, authController.telegramStatus);

export default router;


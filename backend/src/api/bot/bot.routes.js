import { Router } from 'express';
import * as botController from './bot.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

/**
 * Phase R1 + R5: Bot Session Routes
 *
 * GET   /api/bot/session     — 10 most recent sessions (ActivityPanel polling) [R5]
 * POST  /api/bot/session     — Create a new BotSession (stores intent + slots)
 * PATCH /api/bot/session/:id — Merge updated slots into an existing BotSession
 *
 * GET is public (read-only, no sensitive data) so the ActivityPanel can poll
 * without embedding a JWT in every 15-second tick.
 * POST + PATCH require a valid JWT from the bot backend.
 */

router.get('/session', authenticate, botController.getSessions);

router.post('/session', authenticate, botController.createSession);

router.patch('/session/:id', authenticate, botController.updateSession);

export default router;

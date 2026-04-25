import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getEvents } from './events.controller.js';

const router = Router();

/**
 * Phase 6: Events polling endpoint.
 *
 * GET /api/events — Authenticated users poll for AI action log events.
 *
 * Future SSE upgrade path:
 *   GET /api/events/stream with res.setHeader('Content-Type', 'text/event-stream')
 *   This JSON polling endpoint stays unchanged during that migration.
 */
router.get('/', authenticate, getEvents);

export default router;

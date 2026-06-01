/**
 * Phase R4 + S2: Voice Routes
 *
 * POST /api/voice/webhook      — Vapi webhook (no auth — Vapi can't send JWT)
 * GET  /api/voice/logs         — Recent call logs (authenticated, any role)
 * POST /api/voice/call         — Trigger single outbound call (authenticated, 1 credit)
 * POST /api/voice/test-call    — Trigger Vapi web test call (ADMIN only)
 * POST /api/voice/bulk-call    — Trigger calls for all unconfirmed (authenticated, 1 credit per call)
 */

import { Router } from 'express';
import * as voiceController from './voice.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { restrictTo } from '../../middleware/rbac.js';
import { requireCredits } from '../../middleware/credits.js';

const router = Router();

// ── Public: Vapi webhook ──────────────────────────────────────────────────────────────
router.post('/webhook', voiceController.webhook);

// ── Authenticated: call log feed (used by ActivityPanel frontend) ────────────────────
router.get('/logs', authenticate, voiceController.getCallLogs);

// ── Authenticated: call management (1 credit per action) ──────────────────────────
router.post('/call',      authenticate, requireCredits(1), voiceController.triggerCall);
router.post('/test-call', authenticate, restrictTo(['ADMIN']), voiceController.triggerTestCall);
router.post('/bulk-call', authenticate, requireCredits(1), voiceController.bulkCall);

export default router;

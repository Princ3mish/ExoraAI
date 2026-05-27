/**
 * Phase R4: Voice Routes
 *
 * POST /api/voice/webhook      — Vapi webhook (no auth — Vapi can't send JWT)
 * GET  /api/voice/logs         — Recent call logs (authenticated, any role)
 * POST /api/voice/call         — Trigger single outbound call (ADMIN only)
 * POST /api/voice/test-call    — Trigger Vapi web test call (ADMIN only)
 * POST /api/voice/bulk-call    — Trigger calls for all unconfirmed in meeting (ADMIN only)
 */

import { Router } from 'express';
import * as voiceController from './voice.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { restrictTo } from '../../middleware/rbac.js';

const router = Router();

// ── Public: Vapi webhook ──────────────────────────────────────────────────────
// Vapi sends JSON — no body-parser override needed (global json() middleware applies)
router.post('/webhook', voiceController.webhook);

// ── Authenticated: call log feed (used by ActivityPanel frontend) ─────────────
router.get('/logs', authenticate, voiceController.getCallLogs);

// ── Admin only: call management ───────────────────────────────────────────────
router.post('/call',      authenticate, restrictTo(['ADMIN']), voiceController.triggerCall);
router.post('/test-call', authenticate, restrictTo(['ADMIN']), voiceController.triggerTestCall);
router.post('/bulk-call', authenticate, restrictTo(['ADMIN']), voiceController.bulkCall);

export default router;

import { Router } from 'express';
import * as aiController from './ai.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { restrictTo } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { suggestTimesSchema, draftEmailSchema, summarySchema, simulateCallSchema } from './ai.schema.js';

const router = Router();

/**
 * Phase 4: AI Routes
 *
 * GET  /api/ai/suggest-times/:meetingId — ADMIN-only, AI-ranked time slots
 * POST /api/ai/draft-email              — ADMIN-only, generate email draft
 * POST /api/ai/summary                  — ADMIN or USER, meeting summary
 */

router.get(
  '/suggest-times/:meetingId',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(suggestTimesSchema),
  aiController.suggestTimes
);

router.post(
  '/draft-email',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(draftEmailSchema),
  aiController.draftEmail
);

router.post(
  '/summary',
  authenticate,
  validateRequest(summarySchema),
  aiController.summary
);

// Phase 6: Voice simulation
router.post(
  '/simulate-call',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(simulateCallSchema),
  aiController.simulateCall
);

export default router;

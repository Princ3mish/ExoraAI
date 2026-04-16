import { Router } from 'express';
import * as meetingsController from './meetings.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { restrictTo } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createMeetingSchema, respondToInviteSchema } from './meetings.schema.js';

const router = Router();

/**
 * Phase 3: Meetings Routes
 *
 * POST /api/meetings              — Create a meeting (ADMIN only)
 * GET  /api/meetings              — List meetings (ADMIN: all, USER: own)
 * PUT  /api/meetings/:id/respond  — Respond to an invitation (authenticated users)
 */

router.post(
  '/',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(createMeetingSchema),
  meetingsController.createMeeting
);

router.get('/', authenticate, meetingsController.getMeetings);

router.put(
  '/:id/respond',
  authenticate,
  validateRequest(respondToInviteSchema),
  meetingsController.respondToInvite
);

export default router;

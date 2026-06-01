import { Router } from 'express';
import * as meetingsController from './meetings.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { restrictTo } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { requireCredits } from '../../middleware/credits.js';
import {
  createMeetingSchema,
  respondToInviteSchema,
  getMeetingSchema,
  updateMeetingSchema,
  deleteMeetingSchema,
} from './meetings.schema.js';

const router = Router();

/**
 * Phase 3 + S2: Meetings Routes
 *
 * POST /api/meetings              — Create a meeting (all authenticated users, 1 credit)
 * GET  /api/meetings              — List meetings (ADMIN: all, USER: own + organised)
 * GET  /api/meetings/calendar     — Calendar-formatted meetings within a date window
 * GET  /api/meetings/:id          — Get meeting by ID (ADMIN or participant/organizer)
 * PUT  /api/meetings/:id          — Update/reschedule a meeting (organizer or ADMIN)
 * DELETE /api/meetings/:id        — Delete a meeting (organizer or ADMIN)
 * PUT  /api/meetings/:id/respond  — Respond to an invitation (authenticated users)
 */

router.post(
  '/',
  authenticate,
  requireCredits(1),
  validateRequest(createMeetingSchema),
  meetingsController.createMeeting
);

router.get('/', authenticate, meetingsController.getMeetings);

// Phase R1: Calendar view — must come BEFORE /:id so Express doesn't treat
// 'calendar' as a meeting ID.
router.get('/calendar', authenticate, meetingsController.getCalendar);

router.get(
  '/:id',
  authenticate,
  validateRequest(getMeetingSchema),
  meetingsController.getMeetingById
);

router.put(
  '/:id',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(updateMeetingSchema),
  meetingsController.updateMeeting
);

router.delete(
  '/all',
  authenticate,
  restrictTo(['ADMIN']),
  meetingsController.deleteAllMeetings
);

router.delete(
  '/:id',
  authenticate,
  restrictTo(['ADMIN']),
  validateRequest(deleteMeetingSchema),
  meetingsController.deleteMeeting
);

router.put(
  '/:id/respond',
  authenticate,
  validateRequest(respondToInviteSchema),
  meetingsController.respondToInvite
);

export default router;

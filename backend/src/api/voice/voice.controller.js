/**
 * Phase R4: Voice Controller
 *
 * Thin HTTP adapter — all business logic lives in voice.service.js.
 *
 * Routes:
 *   POST /api/voice/webhook       — Vapi event webhook (no auth)
 *   GET  /api/voice/logs          — Recent call log feed for ActivityPanel
 *   POST /api/voice/call          — Admin: trigger call for a single participant
 *   POST /api/voice/test-call     — Admin: trigger Vapi web call for testing
 */

import * as voiceService from './voice.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import logger from '../../utils/logger.js';

// ── POST /api/voice/webhook ───────────────────────────────────────────────────
/**
 * Vapi sends JSON POST events here.
 * CRITICAL: respond 200 immediately, process async so Vapi doesn't retry.
 */
export const webhook = async (req, res) => {
  // ACK immediately — Vapi expects a fast 200
  res.status(200).json({ received: true });

  // Process async — errors are caught internally and never affect the 200
  setImmediate(async () => {
    try {
      await voiceService.handleWebhook(req.body);
    } catch (err) {
      logger.error('[VoiceController] Webhook async processing failed', {
        error: err.message,
        stack: err.stack,
      });
    }
  });
};

// ── GET /api/voice/logs ───────────────────────────────────────────────────────
/**
 * Returns recent VoiceCallLog records for the ActivityPanel.
 * Query: ?limit=20
 */
export const getCallLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
  const { userId, role } = req.user;
  const logs = await voiceService.getCallLogs(limit, userId, role);
  res.status(200).json({ status: 200, data: logs });
});

// ── POST /api/voice/call ──────────────────────────────────────────────────────
/**
 * Admin triggers an outbound call to a specific participant.
 * Body: { meetingId, participantUserId }
 */
export const triggerCall = asyncHandler(async (req, res) => {
  const { meetingId, participantUserId } = req.body;
  const callerUserId = req.user.userId;

  if (!meetingId || !participantUserId) {
    const err = new Error('meetingId and participantUserId are required.');
    err.statusCode = 400;
    throw err;
  }

  const callLog = await voiceService.triggerCall({ meetingId, participantUserId, callerUserId });
  res.status(201).json({ status: 201, message: 'Call initiated.', data: callLog });
});

// ── POST /api/voice/test-call ─────────────────────────────────────────────────
/**
 * Admin triggers a Vapi web call for browser testing.
 * Body: { meetingId }
 * Returns: { callLogId, callSid, webCallUrl }
 */
export const triggerTestCall = asyncHandler(async (req, res) => {
  const { meetingId } = req.body;

  if (!meetingId) {
    const err = new Error('meetingId is required.');
    err.statusCode = 400;
    throw err;
  }

  const result = await voiceService.triggerTestCall(meetingId);
  res.status(201).json({
    status: 201,
    message: 'Test web call initiated.',
    data: result,
  });
});

// ── POST /api/voice/bulk-call ─────────────────────────────────────────────────
/**
 * Admin triggers calls for ALL unconfirmed participants in a meeting.
 * Body: { meetingId }
 * Returns: { totalCalled, totalSkipped, totalFailed, results[] }
 */
export const bulkCall = asyncHandler(async (req, res) => {
  const { meetingId } = req.body;
  const callerUserId = req.user.userId;

  if (!meetingId) {
    const err = new Error('meetingId is required.');
    err.statusCode = 400;
    throw err;
  }

  // Import Prisma inline to avoid circular dependency
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: {
        where: { status: 'PENDING' },
        select: { userId: true, phoneNumber: true, user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const results = [];
  let totalCalled = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const participant of meeting.participants) {
    try {
      const callLog = await voiceService.triggerCall({
        meetingId,
        participantUserId: participant.userId,
        callerUserId,
      });

      if (callLog.outcome === 'skipped_no_phone') {
        totalSkipped++;
        results.push({ participantId: participant.userId, status: 'skipped_no_phone', callLogId: callLog.id });
      } else {
        totalCalled++;
        results.push({ participantId: participant.userId, callSid: callLog.callSid, status: 'initiated', callLogId: callLog.id });
      }
    } catch (err) {
      totalFailed++;
      logger.error('[VoiceController] bulkCall: participant call failed', {
        meetingId,
        participantUserId: participant.userId,
        error: err.message,
      });
      results.push({ participantId: participant.userId, status: 'failed', error: err.message });
    }
  }

  res.status(200).json({
    status: 200,
    data: { meetingId, totalCalled, totalSkipped, totalFailed, results },
  });
});

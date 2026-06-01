/**
 * Phase R4: Voice Service — Vapi Integration
 *
 * Replaces the Twilio stub with real Vapi outbound phone call support.
 *
 * Exports:
 *   triggerCall(meetingId, participantUserId, callerUserId?)
 *   triggerTestCall(meetingId)
 *   handleWebhook(body)
 *   getCallLogs(limit?)
 */

import { VapiClient } from '@vapi-ai/server-sdk';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';
import { logEvent } from '../../utils/logEvent.js';
import { generateCompletion } from '../../services/ai.service.js';
import { TASK_TYPES } from '../../utils/ai.prompts.js';

const prisma = new PrismaClient();

// ─── Vapi client (lazy-singleton) ────────────────────────────────────────────

let _vapiClient = null;

function getVapiClient() {
  if (!_vapiClient) {
    const { VAPI_API_KEY } = process.env;
    if (!VAPI_API_KEY) {
      throw new Error('[VoiceService] VAPI_API_KEY is not configured');
    }
    _vapiClient = new VapiClient({ token: VAPI_API_KEY });
  }
  return _vapiClient;
}

// ─── triggerCall ─────────────────────────────────────────────────────────────

/**
 * Initiate a Vapi outbound phone call to a single participant.
 *
 * If the participant has no phoneNumber, a VoiceCallLog with
 * outcome = 'skipped_no_phone' is created and the function returns
 * gracefully (no exception thrown) so the scheduler can continue.
 *
 * @param {object} opts
 * @param {string} opts.meetingId
 * @param {string} opts.participantUserId
 * @param {string} [opts.callerUserId]
 * @returns {Promise<object>} The created/updated VoiceCallLog record
 */
export const triggerCall = async ({ meetingId, participantUserId, callerUserId }) => {
  // 1. Load meeting
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, title: true, startTime: true, voiceCallStatus: true },
  });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Load participant + user details
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: participantUserId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!participant) {
    const err = new Error('Participant not found in this meeting.');
    err.statusCode = 404;
    throw err;
  }

  const phoneNumber = participant.phoneNumber;

  logger.info('[VoiceService] triggerCall invoked', {
    meetingId,
    participantUserId,
    hasPhone: !!phoneNumber,
  });

  // 3. No phone number → log + return gracefully
  if (!phoneNumber) {
    logger.warn('[VoiceService] Participant has no phoneNumber — skipping call', {
      meetingId,
      participantUserId,
    });

    const skippedLog = await prisma.voiceCallLog.create({
      data: {
        participantUserId,
        participantMeetingId: meetingId,
        meetingId,
        outcome: 'skipped_no_phone',
        agendaExtracted: [],
      },
    });

    await logEvent({
      type: 'SYSTEM',
      message: `Skipped call — no phone number for ${participant.user.name || participant.user.email}`,
      status: 'failed',
      meetingId,
      userId: callerUserId || null,
      metadata: { callLogId: skippedLog.id, participantUserId },
    });

    return skippedLog;
  }

  // 4. Create VoiceCallLog (pending)
  const callLog = await prisma.voiceCallLog.create({
    data: {
      participantUserId,
      participantMeetingId: meetingId,
      meetingId,
      outcome: 'pending',
      agendaExtracted: [],
    },
  });

  logger.info('[VoiceService] VoiceCallLog created', {
    callLogId: callLog.id,
    meetingId,
    participantUserId,
  });

  // 5. Initiate Vapi phone call
  let callSid = null;
  try {
    const vapi = getVapiClient();

    const vapiCall = await vapi.calls.create({
      assistantId: process.env.VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: phoneNumber },
      assistantOverrides: {
        variableValues: {
          meetingTitle: meeting.title,
          participantName: participant.user.name || participant.user.email,
          meetingTime: meeting.startTime ? meeting.startTime.toISOString() : '',
        },
      },
    });

    callSid = vapiCall.id; // Vapi uses 'id' as the call identifier
    logger.info('[VoiceService] Vapi call initiated', {
      callSid,
      meetingId,
      participantUserId,
    });

    await logEvent({
      type: 'SYSTEM',
      message: `Vapi call initiated for ${participant.user.name || participant.user.email} — meeting "${meeting.title}"`,
      status: 'pending',
      meetingId,
      userId: callerUserId || null,
      metadata: { callLogId: callLog.id, callSid, participantUserId },
    });
  } catch (vapiErr) {
    logger.error('[VoiceService] Vapi call creation failed', {
      error: vapiErr.message,
      meetingId,
      participantUserId,
    });

    await logEvent({
      type: 'ERROR',
      message: `Vapi call failed for ${participant.user.name || participantUserId}: ${vapiErr.message}`,
      status: 'failed',
      meetingId,
      metadata: { callLogId: callLog.id, error: vapiErr.message },
    });

    // Update log to 'failed' so it's visible in ActivityPanel
    await prisma.voiceCallLog.update({
      where: { id: callLog.id },
      data: { outcome: 'failed' },
    });
    throw vapiErr;
  }

  // 6. Persist callSid + flip Meeting status
  const updatedLog = await prisma.voiceCallLog.update({
    where: { id: callLog.id },
    data: { callSid, outcome: 'initiated' },
  });

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { voiceCallStatus: 'in_progress' },
  });

  return updatedLog;
};

// ─── triggerTestCall ──────────────────────────────────────────────────────────

/**
 * Initiate a Vapi web call (browser-based, no phone required).
 * Returns { webCallUrl } for the frontend to open.
 *
 * @param {string} meetingId
 * @returns {Promise<{ callLogId: string, webCallUrl: string }>}
 */
export const triggerTestCall = async (meetingId) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, title: true, startTime: true },
  });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const vapi = getVapiClient();

  // Vapi web call — POST /call/web via the SDK
  const vapiCall = await vapi.calls.create({
    type: 'webCall',
    assistantId: process.env.VAPI_ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        meetingTitle: meeting.title,
        meetingTime: meeting.startTime ? meeting.startTime.toISOString() : '',
        participantName: 'Test User',
      },
    },
  });

  const callLog = await prisma.voiceCallLog.create({
    data: {
      // Web test calls have no real participant — use system placeholder
      participantUserId: 'system',
      participantMeetingId: meetingId,
      meetingId,
      callSid: vapiCall.id,
      outcome: 'test_initiated',
      agendaExtracted: [],
    },
  });

  logger.info('[VoiceService] Test web call initiated', {
    callSid: vapiCall.id,
    meetingId,
    webCallUrl: vapiCall.webCallUrl,
  });

  return {
    callLogId: callLog.id,
    callSid: vapiCall.id,
    webCallUrl: vapiCall.webCallUrl,
  };
};

// ─── handleWebhook ────────────────────────────────────────────────────────────

/**
 * Process a Vapi webhook event.
 *
 * Vapi sends JSON — NOT form-encoded.
 * Always resolves (never throws) so the controller can return 200 immediately.
 *
 * Supported message.type values:
 *   call-started        → log + set outcome = 'in_progress'
 *   transcript          → log partial transcript chunk
 *   end-of-call-report  → extract agenda via Groq, update Meeting + VoiceCallLog
 *   status-update       → handle no-answer / busy / failed
 *
 * @param {object} body - req.body from Vapi webhook POST
 * @returns {Promise<void>}
 */
export const handleWebhook = async (body) => {
  const message = body?.message ?? body;
  const eventType = message?.type;
  const callId = message?.call?.id ?? message?.callId ?? null;

  logger.info('[VoiceService] Webhook received', { eventType, callId });

  if (!eventType) {
    logger.warn('[VoiceService] Webhook missing message.type', { body });
    return;
  }

  // ── call-started ──────────────────────────────────────────────────────────
  if (eventType === 'call-started') {
    logger.info('[VoiceService] Call started', { callId });

    if (callId) {
      const log = await prisma.voiceCallLog.findFirst({ where: { callSid: callId } });
      if (log) {
        await prisma.voiceCallLog.update({
          where: { id: log.id },
          data: { outcome: 'in_progress' },
        });
        logger.info('[VoiceService] VoiceCallLog updated → in_progress', {
          callLogId: log.id,
          callId,
          meetingId: log.meetingId,
        });
      }
    }
    return;
  }

  // ── transcript (partial) ──────────────────────────────────────────────────
  if (eventType === 'transcript') {
    const chunk = message?.transcript ?? '';
    logger.info('[VoiceService] Transcript chunk received', {
      callId,
      chunkLength: chunk.length,
    });
    // Partial transcripts are only logged — we use the full transcript from
    // end-of-call-report for agenda extraction.
    return;
  }

  // ── end-of-call-report ────────────────────────────────────────────────────
  if (eventType === 'end-of-call-report') {
    const { transcript, summary, durationSeconds, endedReason } = message;

    logger.info('[VoiceService] End-of-call report received', {
      callId,
      durationSeconds,
      endedReason,
      hasTranscript: !!transcript,
    });

    if (!callId) {
      logger.warn('[VoiceService] end-of-call-report missing callId', { body });
      return;
    }

    let callLog = await prisma.voiceCallLog.findFirst({
      where: { callSid: callId },
    });

    // Issue 1 fix: Vapi dashboard test calls create no prior VoiceCallLog.
    // Synthesise one now so we can still persist transcript + agenda.
    if (!callLog) {
      logger.warn(
        '[VoiceService] No VoiceCallLog found for callId — creating orphan log for direct test call',
        { callId },
      );
      // NOTE: VoiceCallLog has non-nullable FKs (participantUserId, participantMeetingId,
      // meetingId) so we must use system placeholder values.
      // We cannot set meetingId=null because the schema FK is non-optional.
      // Instead we skip the Meeting update below when no real meetingId exists.
      callLog = {
        id: null,          // flag: record was not pre-created
        meetingId: null,   // no associated meeting
        transcript: null,
        outcome: 'pending',
        agendaExtracted: [],
        duration: null,
        _isOrphan: true,
      };
    }

    const meetingId = callLog.meetingId ?? null;
    let agendaExtracted = [];
    let confirmed = false;
    let aiOutcome = 'inconclusive';

    // ── Groq agenda extraction ────────────────────────────────────────────
    if (transcript && transcript.trim().length > 10) {
      try {
        await logEvent({
          type: 'AI_ACTION',
          message: `Extracting agenda from Vapi transcript (callId: ${callId})`,
          status: 'pending',
          meetingId,
          metadata: { callLogId: callLog.id },
        });

        const aiResult = await generateCompletion({
          taskType: TASK_TYPES.AGENDA_EXTRACTION,
          input: { transcript, meetingId },
          metadata: { meetingId },
        });

        agendaExtracted = Array.isArray(aiResult?.agendaTopics) ? aiResult.agendaTopics : [];
        aiOutcome = aiResult?.outcome ?? 'inconclusive';
        confirmed = aiOutcome === 'confirmed';

        // Issue 1 fix: log full extracted result as required
        logger.info('[VoiceService] Agenda extracted', {
          agendaTopics: agendaExtracted,
          confirmed,
          outcome: aiOutcome,
        });

        await logEvent({
          type: 'AI_ACTION',
          message: `Agenda extracted — ${agendaExtracted.length} topic(s), outcome: ${aiOutcome}`,
          status: 'success',
          meetingId,
          metadata: { callLogId: callLog.id, agendaTopics: agendaExtracted, aiOutcome },
        });

        logger.info('[VoiceService] Agenda extraction complete', {
          callId,
          meetingId,
          agendaExtracted,
          confirmed,
        });
      } catch (aiErr) {
        logger.error('[VoiceService] Agenda extraction failed', {
          error: aiErr.message,
          callId,
          meetingId,
        });
        await logEvent({
          type: 'ERROR',
          message: `Agenda extraction failed for callId ${callId}: ${aiErr.message}`,
          status: 'failed',
          meetingId,
          metadata: { callLogId: callLog.id, error: aiErr.message },
        });
      }
    } else {
      logger.warn('[VoiceService] No usable transcript in end-of-call-report', { callId });
    }

    // ── Persist to Meeting (Issue 2 fix: only when meetingId is known) ───
    if (meetingId) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          agendaTopics: agendaExtracted.length > 0 ? agendaExtracted : undefined,
          voiceCallStatus: 'completed',
          confirmationStatus: confirmed ? 'confirmed' : 'unconfirmed',
        },
      });
      logger.info('[VoiceService] Meeting record updated with agenda', {
        meetingId,
        agendaCount: agendaExtracted.length,
        confirmed,
      });
    } else {
      logger.info('[VoiceService] Skipping Meeting update — orphan/test call (no meetingId)', { callId });
    }

    // ── Persist to VoiceCallLog ───────────────────────────────────────────
    // Only update if this is a real DB record (non-orphan call log)
    if (callLog.id && !callLog._isOrphan) {
      await prisma.voiceCallLog.update({
        where: { id: callLog.id },
        data: {
          transcript: transcript || null,
          outcome: confirmed ? 'confirmed' : 'declined',
          agendaExtracted,
          duration: durationSeconds ? Math.round(durationSeconds) : null,
        },
      });

      logger.info('[VoiceService] VoiceCallLog finalized', {
        callLogId: callLog.id,
        meetingId,
        confirmed,
        agendaCount: agendaExtracted.length,
      });
    } else {
      // Orphan call log — log outcome only (no DB record to update)
      logger.info('[VoiceService] Orphan call log — agenda processing complete, no DB record to update', {
        callId,
        confirmed,
        agendaCount: agendaExtracted.length,
        agendaTopics: agendaExtracted,
      });
    }

    return;
  }

  // ── status-update (no-answer / busy / failed) ─────────────────────────────
  if (eventType === 'status-update') {
    const { endedReason } = message;
    const failureReasons = ['no-answer', 'busy', 'failed', 'voicemail'];

    if (failureReasons.includes(endedReason)) {
      logger.warn('[VoiceService] Call ended with failure reason', { callId, endedReason });

      if (callId) {
        const callLog = await prisma.voiceCallLog.findFirst({ where: { callSid: callId } });
        if (callLog) {
          await Promise.all([
            prisma.voiceCallLog.update({
              where: { id: callLog.id },
              data: { outcome: endedReason.replace('-', '_') },
            }),
            prisma.meeting.update({
              where: { id: callLog.meetingId },
              data: { voiceCallStatus: 'failed' },
            }),
          ]);

          await logEvent({
            type: 'ERROR',
            message: `Call ended: ${endedReason} (callId: ${callId})`,
            status: 'failed',
            meetingId: callLog.meetingId,
            metadata: { callLogId: callLog.id, endedReason },
          });

          logger.info('[VoiceService] Meeting voiceCallStatus set to failed', {
            callLogId: callLog.id,
            meetingId: callLog.meetingId,
            endedReason,
          });
        }
      }
    } else {
      logger.info('[VoiceService] Status update (non-failure)', { callId, endedReason });
    }
    return;
  }

  logger.info('[VoiceService] Unhandled webhook event type', { eventType, callId });
};

// ─── getCallLogs ──────────────────────────────────────────────────────────────

/**
 * Return recent VoiceCallLog records with joined meeting title
 * and participant name — used by the frontend ActivityPanel.
 *
 * @param {number} [limit=20]
 * @param {string} [userId]   - scope to meetings organised by this user (non-admin)
 * @param {string} [role]     - 'ADMIN' bypasses scoping
 * @returns {Promise<object[]>}
 */
export const getCallLogs = async (limit = 20, userId, role) => {
  const where = (role !== 'ADMIN' && userId)
    ? { meeting: { organizerId: userId } }
    : {};

  const logs = await prisma.voiceCallLog.findMany({
    where,
    take: limit,
    orderBy: { calledAt: 'desc' },
    include: {
      meeting: { select: { id: true, title: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    callSid: log.callSid,
    meetingId: log.meetingId,
    meetingTitle: log.meeting?.title ?? null,
    participantUserId: log.participantUserId,
    outcome: log.outcome,
    agendaExtracted: log.agendaExtracted,
    duration: log.duration,
    transcript: log.transcript,
    calledAt: log.calledAt,
    // Friendly summary for ActivityPanel
    summary: buildSummary(log),
  }));
};

function buildSummary(log) {
  if (log.outcome === 'skipped_no_phone') return 'Skipped — participant has no phone number';
  if (log.outcome === 'confirmed') {
    const n = log.agendaExtracted?.length ?? 0;
    return `Call confirmed — ${n} agenda topic${n !== 1 ? 's' : ''} extracted`;
  }
  if (log.outcome === 'declined') return 'Participant declined during the call';
  if (log.outcome === 'no_answer') return 'No answer';
  if (log.outcome === 'failed') return 'Call failed';
  if (log.outcome === 'in_progress') return 'Call in progress';
  if (log.outcome === 'initiated') return 'Call initiated, awaiting answer';
  if (log.outcome === 'test_initiated') return 'Test web call initiated';
  return `Call ${log.outcome}`;
}

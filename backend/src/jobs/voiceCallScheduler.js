import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { logEvent } from '../utils/logEvent.js';
import { triggerCall } from '../api/voice/voice.service.js';

const prisma = new PrismaClient();

/**
 * Phase R1: Voice Call Scheduler
 *
 * Runs every 5 minutes.
 * Finds meetings that:
 *   1. Start between 25 and 35 minutes from now  (the "approaching" window)
 *   2. Have voiceCallStatus = 'pending'          (not yet called)
 *
 * For each matching meeting, iterates participants whose RSVP status is
 * PENDING (i.e. unconfirmed) and triggers an outbound call.
 *
 * Each call failure is caught individually so one bad participant never
 * prevents calls to the rest of the meeting's participants.
 */

// ─── Window constants ────────────────────────────────────────────────────────

const WINDOW_LOWER_MINUTES = 25;
const WINDOW_UPPER_MINUTES = 35;

// ─── Core polling function ───────────────────────────────────────────────────

export async function runVoiceCallScheduler() {
  const now = new Date();

  const windowStart = new Date(now.getTime() + WINDOW_LOWER_MINUTES * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + WINDOW_UPPER_MINUTES * 60 * 1000);

  logger.info('[VoiceScheduler] Running poll', {
    windowStart: windowStart.toISOString(),
    windowEnd:   windowEnd.toISOString(),
  });

  // 1. Find all qualifying meetings
  let meetings;
  try {
    meetings = await prisma.meeting.findMany({
      where: {
        voiceCallStatus: 'pending',
        startTime: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        participants: {
          where: { status: 'PENDING' }, // only unconfirmed participants
          select: {
            userId:      true,
            meetingId:   true,
            phoneNumber: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  } catch (dbErr) {
    logger.error('[VoiceScheduler] DB query failed', { error: dbErr.message });
    return;
  }

  if (meetings.length === 0) {
    logger.info('[VoiceScheduler] No qualifying meetings found');
    return;
  }

  logger.info(`[VoiceScheduler] Found ${meetings.length} meeting(s) to process`);

  // 2. Process each meeting
  for (const meeting of meetings) {
    const unconfirmedParticipants = meeting.participants;

    if (unconfirmedParticipants.length === 0) {
      logger.info(`[VoiceScheduler] Meeting ${meeting.id} has no unconfirmed participants — skipping`);
      continue;
    }

    await logEvent({
      type: 'SYSTEM',
      message: `Scheduler: initiating calls for meeting "${meeting.title}" (${unconfirmedParticipants.length} unconfirmed participant(s))`,
      status: 'pending',
      meetingId: meeting.id,
      metadata: {
        participantCount: unconfirmedParticipants.length,
        windowStart: windowStart.toISOString(),
      },
    });

    // 3. Trigger a call per unconfirmed participant (failures are isolated)
    let totalCalled = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const participant of unconfirmedParticipants) {
      try {
        logger.info(`[VoiceScheduler] Calling participant ${participant.user.email} for meeting ${meeting.id}`);

        const callLog = await triggerCall({
          meetingId:         meeting.id,
          participantUserId: participant.userId,
          callerUserId:      null, // system-initiated
        });

        if (callLog.outcome === 'skipped_no_phone') {
          totalSkipped++;
          logger.info(`[VoiceScheduler] Skipped (no phone) for ${participant.user.email}`, {
            meetingId: meeting.id,
            participantUserId: participant.userId,
          });
        } else {
          totalCalled++;
          logger.info(`[VoiceScheduler] Call initiated for ${participant.user.email}`, {
            meetingId: meeting.id,
            participantUserId: participant.userId,
            callSid: callLog.callSid,
          });
        }
      } catch (callErr) {
        totalFailed++;
        logger.error('[VoiceScheduler] Failed to trigger call for participant', {
          meetingId:         meeting.id,
          participantUserId: participant.userId,
          error:             callErr.message,
        });

        await logEvent({
          type:      'ERROR',
          message:   `Scheduler failed to call ${participant.user.email} for meeting "${meeting.title}": ${callErr.message}`,
          status:    'failed',
          meetingId: meeting.id,
          metadata:  { participantUserId: participant.userId, error: callErr.message },
        });
        // Continue to next participant — never abort the whole batch
      }
    }

    // 4. Per-meeting summary log
    logger.info('[VoiceScheduler] Meeting batch complete', {
      meetingId: meeting.id,
      title: meeting.title,
      totalCalled,
      totalSkipped,
      totalFailed,
    });

    await logEvent({
      type: 'SYSTEM',
      message: `Scheduler batch for "${meeting.title}": ${totalCalled} called, ${totalSkipped} skipped, ${totalFailed} failed`,
      status: totalFailed > 0 ? 'failed' : 'success',
      meetingId: meeting.id,
      metadata: { totalCalled, totalSkipped, totalFailed },
    });
  }

  logger.info('[VoiceScheduler] Poll complete');
}

// ─── Cron registration ───────────────────────────────────────────────────────

/**
 * Start the voice call scheduler cron job.
 *
 * Cron expression: '* /5 * * * *'  → every 5 minutes
 * (space removed from comment — actual string has no space after *)
 *
 * @returns {cron.ScheduledTask} The task handle — call .destroy() to stop.
 */
export function startVoiceCallScheduler() {
  // Guard: don't start in test environment
  if (process.env.NODE_ENV === 'test') {
    logger.info('[VoiceScheduler] Skipped — NODE_ENV is test');
    return null;
  }

  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      await runVoiceCallScheduler();
    } catch (err) {
      // Top-level safety net — cron must never crash the process
      logger.error('[VoiceScheduler] Unhandled error in cron tick', { error: err.message, stack: err.stack });
    }
  });

  logger.info('[VoiceScheduler] Scheduled — runs every 5 minutes');
  return task;
}

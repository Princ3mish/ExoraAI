import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';
import { logEvent } from '../../utils/logEvent.js';
import { sendBulkEmail } from '../../services/email.service.js';

const prisma = new PrismaClient();

/**
 * Phase 3: Meetings Service — all business logic for meeting lifecycle.
 *
 * Core responsibilities:
 *  - Conflict detection: check overlapping meetings for each participant (PENDING or ACCEPTED)
 *  - Meeting creation with auto-populated PENDING participants
 *  - Scoped retrieval (ADMIN = all, USER = own participations)
 *  - Invitation response (ACCEPTED/REJECTED) + dynamic CONFIRMED meeting status
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Checks if a user already has an overlapping meeting (status PENDING or ACCEPTED).
 * Overlap condition: existing.startTime < newEnd AND existing.endTime > newStart
 *
 * @param {string} userId
 * @param {Date} newStart - startTime of the candidate meeting
 * @param {Date} newEnd   - endTime of the candidate meeting
 * @param {string|null} excludeMeetingId - meeting ID to exclude from the check (for updates)
 * @returns {object|null} Conflicting meeting record or null
 */
const findConflictingMeeting = async (userId, newStart, newEnd, excludeMeetingId = null) => {
  return prisma.participant.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      meeting: {
        id: excludeMeetingId ? { not: excludeMeetingId } : undefined,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    },
    include: {
      meeting: { select: { id: true, title: true, startTime: true, endTime: true } },
    },
  });
};

/**
 * After any participant status change, re-evaluate the meeting's top-level status:
 *  - CONFIRMED if ALL participants have ACCEPTED
 *  - CANCELLED if ALL participants have REJECTED
 *  - PENDING otherwise (at least one still pending/mixed)
 */
const recalculateMeetingStatus = async (meetingId) => {
  const allParticipants = await prisma.participant.findMany({
    where: { meetingId },
    select: { status: true },
  });

  const statuses = allParticipants.map((p) => p.status);
  let newMeetingStatus = 'PENDING';

  if (statuses.length > 0 && statuses.every((s) => s === 'ACCEPTED')) {
    newMeetingStatus = 'CONFIRMED';
  } else if (statuses.length > 0 && statuses.every((s) => s === 'REJECTED')) {
    newMeetingStatus = 'CANCELLED';
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: newMeetingStatus },
  });

  return newMeetingStatus;
};

// ─── Phase 6: Fire-and-forget email helper ───────────────────────────────────

/**
 * Send invite emails to all participants after a meeting is created.
 * Uses AI to draft the email; falls back to a plain-text template if AI fails.
 * Non-blocking: all errors are caught and logged via logEvent.
 */
const _sendMeetingInviteEmails = async (meeting, organizerId) => {
  try {
    const participants = await prisma.participant.findMany({
      where: { meetingId: meeting.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await logEvent({
      type: 'AI_ACTION',
      message: `AI drafting invite email for "${meeting.title}"`,
      status: 'pending',
      meetingId: meeting.id,
      userId: organizerId,
    });

    // Fallback email template (used if AI fails)
    let emailSubject = `Meeting Invitation: ${meeting.title}`;
    let emailBody = `You have been invited to "${meeting.title}".\n\nStart: ${meeting.startTime.toISOString()}\nEnd: ${meeting.endTime.toISOString()}\n\nPlease log in to Exora AI to respond to this invitation.`;

    try {
      // Dynamically import to avoid circular deps at module load time
      const { generateCompletion } = await import('../../services/ai.service.js');
      const { TASK_TYPES } = await import('../../utils/ai.prompts.js');
      const participantsForAI = participants.map(p => ({ name: p.user.name, email: p.user.email }));
      const aiResult = await generateCompletion({
        taskType: TASK_TYPES.DRAFT_EMAIL,
        input: {
          contextType: 'invite',
          meeting: {
            title: meeting.title,
            description: meeting.description,
            startTime: meeting.startTime.toISOString(),
            endTime: meeting.endTime.toISOString(),
          },
          participants: participantsForAI,
        },
        metadata: { userId: organizerId, meetingId: meeting.id },
      });
      if (aiResult?.subject) emailSubject = aiResult.subject;
      if (aiResult?.body) emailBody = aiResult.body;
      await logEvent({
        type: 'AI_ACTION',
        message: `AI email draft ready for "${meeting.title}"`,
        status: 'success',
        meetingId: meeting.id,
        userId: organizerId,
      });
    } catch (aiErr) {
      await logEvent({
        type: 'ERROR',
        message: `AI email draft failed, using fallback template: ${aiErr.message}`,
        status: 'failed',
        meetingId: meeting.id,
        userId: organizerId,
      });
    }

    const recipients = participants.map(p => ({ email: p.user.email, userId: p.user.id }));
    await sendBulkEmail({ recipients, subject: emailSubject, body: emailBody, meetingId: meeting.id });
  } catch (err) {
    logger.error('[_sendMeetingInviteEmails] Unexpected error', { error: err.message, meetingId: meeting.id });
  }
};

// ─── Service Methods ─────────────────────────────────────────────────────────

/**
 * Create a meeting (ADMIN only).
 * Runs conflict detection for every participant before persisting anything.
 */
export const createMeeting = async (organizerId, { title, description, startTime, endTime, participantIds }) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const uniqueParticipantIds = Array.from(new Set(participantIds));

  // Conflict detection pass — check every participant before any DB write
  for (const userId of uniqueParticipantIds) {
    const conflict = await findConflictingMeeting(userId, start, end);
    if (conflict) {
      logger.warn(`Scheduling conflict detected for user ${userId}: overlaps meeting ${conflict.meeting.id}`);
      const err = new Error(
        `Scheduling conflict: user ${userId} already has an overlapping meeting "${conflict.meeting.title}" from ${conflict.meeting.startTime.toISOString()} to ${conflict.meeting.endTime.toISOString()}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Persist meeting and participants atomically
  const meeting = await prisma.meeting.create({
    data: {
      title,
      description,
      startTime: start,
      endTime: end,
      organizerId,
      participants: {
        create: uniqueParticipantIds.map((userId) => ({
          userId,
          status: 'PENDING',
        })),
      },
    },
    include: {
      participants: {
        select: { userId: true, status: true, joinedAt: true },
      },
    },
  });

  logger.info(`Meeting created: ${meeting.id} "${meeting.title}" by organizer ${organizerId}`);

  // Phase 6: Log SYSTEM event for meeting creation
  await logEvent({
    type: 'SYSTEM',
    message: `Meeting "${meeting.title}" created with ${meeting.participants.length} participant(s)`,
    status: 'success',
    meetingId: meeting.id,
    userId: organizerId,
    metadata: { participantCount: meeting.participants.length },
  });

  // Phase 6: Fire-and-forget email — does not block API response
  _sendMeetingInviteEmails(meeting, organizerId).catch(() => {});

  return meeting;
};

/**
 * Retrieve meetings based on caller role:
 *  - ADMIN: all meetings in the system
 *  - USER: only meetings where the caller is a participant
 */
export const getMeetings = async (userId, role) => {
  if (role === 'ADMIN') {
    return prisma.meeting.findMany({
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        participants: { select: { userId: true, status: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // USER: only return meetings where they are a participant
  return prisma.meeting.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      participants: {
        where: { userId },
        select: { status: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });
};

/**
 * Respond to a meeting invitation: update participant status to ACCEPTED or REJECTED.
 * Prevents duplicate responses (idempotent: same status = no-op).
 * Blocks ACCEPTED if a scheduling conflict would be introduced.
 * Recalculates meeting-level status after any change.
 */
export const respondToInvite = async (meetingId, userId, newStatus) => {
  // Verify the participant record exists
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId } },
    include: { meeting: { select: { id: true, title: true, startTime: true, endTime: true } } },
  });

  if (!participant) {
    const err = new Error('You are not a participant in this meeting, or the meeting does not exist.');
    err.statusCode = 404;
    throw err;
  }

  // Idempotency: same status → no-op
  if (participant.status === newStatus) {
    logger.info(`Invite response idempotent: user ${userId} already ${newStatus} for meeting ${meetingId}`);
    return { message: `You have already ${newStatus.toLowerCase()} this meeting.`, participant };
  }

  // Conflict check before accepting
  if (newStatus === 'ACCEPTED') {
    const conflict = await findConflictingMeeting(
      userId,
      participant.meeting.startTime,
      participant.meeting.endTime,
      meetingId // Exclude the current meeting from the overlap check
    );
    if (conflict) {
      logger.warn(`Accept blocked: conflict for user ${userId} on meeting ${meetingId}`);
      const err = new Error(
        `Cannot accept: you have a scheduling conflict with meeting "${conflict.meeting.title}" from ${conflict.meeting.startTime.toISOString()} to ${conflict.meeting.endTime.toISOString()}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Update participant status
  const updated = await prisma.participant.update({
    where: { meetingId_userId: { meetingId, userId } },
    data: { status: newStatus },
    select: { userId: true, meetingId: true, status: true },
  });

  // Recalculate meeting-level status
  const meetingStatus = await recalculateMeetingStatus(meetingId);

  logger.info(`User ${userId} ${newStatus} meeting ${meetingId}. Meeting status → ${meetingStatus}`);

  // Phase 6: Log USER_RESPONSE event
  await logEvent({
    type: 'USER_RESPONSE',
    message: `User ${userId} ${newStatus.toLowerCase()} meeting (status → ${meetingStatus})`,
    status: 'success',
    meetingId,
    userId,
    metadata: { participantStatus: newStatus, meetingStatus },
  });

  return {
    message: `Meeting ${newStatus.toLowerCase()} successfully.`,
    participant: updated,
    meetingStatus,
  };
};

/**
 * Get a single meeting by ID.
 * Access control: ADMIN sees all, USER sees only if participant or organizer.
 */
export const getMeetingById = async (meetingId, userId, role) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      participants: { select: { userId: true, status: true } },
    },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  if (role !== 'ADMIN') {
    const isParticipant = meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant && meeting.organizerId !== userId) {
      const err = new Error('You do not have permission to view this meeting.');
      err.statusCode = 403;
      throw err;
    }
  }

  return meeting;
};

/**
 * Update/reschedule a meeting (ADMIN only).
 * Performs conflict re-checks for the updated time or participants.
 * Resets participant status to PENDING if times or participants changed.
 */
export const updateMeeting = async (meetingId, payload) => {
  const { title, description, startTime, endTime, participantIds } = payload;
  
  const existingMeeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });

  if (!existingMeeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const start = startTime ? new Date(startTime) : existingMeeting.startTime;
  const end = endTime ? new Date(endTime) : existingMeeting.endTime;

  if (end <= start) {
      const err = new Error('endTime must be after startTime.');
      err.statusCode = 400;
      throw err;
  }

  let finalParticipantIds = existingMeeting.participants.map(p => p.userId);
  let participantsChanged = false;
  if (participantIds) {
    finalParticipantIds = Array.from(new Set(participantIds));
    participantsChanged = true;
  }

  const timeChanged = startTime || endTime;

  // Conflict detection pass
  for (const userId of finalParticipantIds) {
    const conflict = await findConflictingMeeting(userId, start, end, meetingId);
    if (conflict) {
      logger.warn(`Scheduling conflict detected for user ${userId} on update: overlaps meeting ${conflict.meeting.id}`);
      const err = new Error(
        `Scheduling conflict: user ${userId} already has an overlapping meeting "${conflict.meeting.title}" from ${conflict.meeting.startTime.toISOString()} to ${conflict.meeting.endTime.toISOString()}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const dataToUpdate = {
    title,
    description,
    startTime: start,
    endTime: end,
  };

  // If participants changed, we replace them
  if (participantsChanged) {
    dataToUpdate.participants = {
      deleteMany: {}, // Clear existing
      create: finalParticipantIds.map((userId) => ({
        userId,
        status: 'PENDING',
      })),
    };
    dataToUpdate.status = 'PENDING';
  }

  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: dataToUpdate,
    include: {
      participants: {
        select: { userId: true, status: true, joinedAt: true },
      },
    },
  });

  if (!participantsChanged && timeChanged) {
    // Time changed, require all participants to re-accept
    await prisma.participant.updateMany({
      where: { meetingId },
      data: { status: 'PENDING' }
    });
    const refreshedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'PENDING' },
      include: {
        participants: { select: { userId: true, status: true, joinedAt: true } }
      }
    });
    logger.info(`Meeting updated and reset to PENDING: ${refreshedMeeting.id}`);
    return refreshedMeeting;
  }

  logger.info(`Meeting updated: ${updatedMeeting.id}`);
  return updatedMeeting;
};

/**
 * Delete/cancel a meeting (ADMIN only).
 */
export const deleteMeeting = async (meetingId) => {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  await prisma.meeting.delete({ where: { id: meetingId } });
  logger.info(`Meeting deleted: ${meetingId}`);
  return { success: true };
};


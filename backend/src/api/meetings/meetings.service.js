import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

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

// ─── Service Methods ─────────────────────────────────────────────────────────

/**
 * Create a meeting (ADMIN only).
 * Runs conflict detection for every participant before persisting anything.
 */
export const createMeeting = async (organizerId, { title, description, startTime, endTime, participantIds }) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Conflict detection pass — check every participant before any DB write
  for (const userId of participantIds) {
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
        create: participantIds.map((userId) => ({
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

  return {
    message: `Meeting ${newStatus.toLowerCase()} successfully.`,
    participant: updated,
    meetingStatus,
  };
};

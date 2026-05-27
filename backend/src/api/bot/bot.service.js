import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';
import { logEvent } from '../../utils/logEvent.js';

const prisma = new PrismaClient();

/**
 * Phase R1: Bot Service — manages BotSession lifecycle.
 *
 * A BotSession tracks a single user conversation thread with the
 * Telegram bot.  It stores the extracted intent and collected slots
 * (structured data) so the bot can resume after any message.
 */

/**
 * Create a new BotSession.
 *
 * @param {object} data
 * @param {string} data.telegramId  - Telegram user/chat ID
 * @param {string} [data.intent]    - Classified intent from the first message
 * @param {object} [data.slots]     - Key/value pairs extracted so far
 * @param {string} [data.meetingId] - Link to a Meeting if already known
 * @returns {Promise<object>}       - Created BotSession record
 */
export const createSession = async ({ telegramId, intent, slots, meetingId }) => {
  if (!telegramId) {
    const err = new Error('telegramId is required to create a BotSession.');
    err.statusCode = 400;
    throw err;
  }

  const session = await prisma.botSession.create({
    data: {
      telegramId: String(telegramId),
      intent: intent || null,
      slots: slots || {},
      status: 'active',
      meetingId: meetingId || null,
    },
  });

  logger.info(`[BotService] Session created: ${session.id} for telegramId ${telegramId}`);

  await logEvent({
    type: 'SYSTEM',
    message: `Bot session created for telegramId ${telegramId}`,
    status: 'success',
    meetingId: meetingId || null,
    metadata: { sessionId: session.id, intent },
  });

  return session;
};

/**
 * Fetch the 10 most recent BotSession records.
 * Used by the ActivityPanel — always returns an array, never throws.
 *
 * @returns {Promise<object[]>}
 */
export const getSessions = async () => {
  const sessions = await prisma.botSession.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      telegramId: true,
      intent: true,
      status: true,
      meetingId: true,
      createdAt: true,
    },
  });
  return sessions;
};

/**
 * Update slots (and optionally intent/status/meetingId) on an existing BotSession.
 * Only provided fields are merged — existing slots are preserved via spread.
 *
 * @param {string} sessionId - BotSession.id
 * @param {object} patch     - Fields to update: { slots, intent, status, meetingId }
 * @returns {Promise<object>} Updated BotSession record
 */
export const updateSession = async (sessionId, { slots, intent, status, meetingId }) => {
  // Verify session exists
  const existing = await prisma.botSession.findUnique({ where: { id: sessionId } });
  if (!existing) {
    const err = new Error('BotSession not found.');
    err.statusCode = 404;
    throw err;
  }

  // Merge slots so callers can send partial updates
  const mergedSlots =
    slots && typeof slots === 'object'
      ? { ...(existing.slots || {}), ...slots }
      : existing.slots;

  const updated = await prisma.botSession.update({
    where: { id: sessionId },
    data: {
      slots: mergedSlots,
      intent: intent !== undefined ? intent : existing.intent,
      status: status !== undefined ? status : existing.status,
      meetingId: meetingId !== undefined ? meetingId : existing.meetingId,
    },
  });

  logger.info(`[BotService] Session updated: ${sessionId}`, { slots: mergedSlots, intent, status });

  await logEvent({
    type: 'SYSTEM',
    message: `Bot session ${sessionId} updated (status: ${updated.status})`,
    status: 'success',
    meetingId: updated.meetingId || null,
    metadata: { sessionId, intent, status },
  });

  return updated;
};

import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient();

/**
 * Phase 6: Write a structured event to the AIEvent table AND emit a Winston log.
 * Non-throwing: DB write failure is logged and swallowed — never crashes calling service.
 *
 * @param {object} opts
 * @param {string} opts.type       - AI_ACTION | SYSTEM | USER_RESPONSE | ERROR | SIMULATION
 * @param {string} opts.message    - Human-readable description of the event
 * @param {string} [opts.status]   - 'success' | 'pending' | 'failed' (default: 'success')
 * @param {string} [opts.meetingId]
 * @param {string} [opts.userId]
 * @param {object} [opts.metadata] - Any extra serializable structured data
 */
export async function logEvent({ type, message, status = 'success', meetingId, userId, metadata }) {
  const winstonMeta = { type, status, meetingId, userId, ...metadata };
  if (status === 'failed') {
    logger.error(`[AIEvent] ${message}`, winstonMeta);
  } else {
    logger.info(`[AIEvent] ${message}`, winstonMeta);
  }

  try {
    await prisma.aIEvent.create({
      data: {
        type,
        message,
        status,
        meetingId: meetingId || null,
        userId: userId || null,
        metadata: metadata || null,
      },
    });
  } catch (err) {
    // Never crash the calling service — log and move on
    logger.error('[logEvent] Failed to persist AIEvent to DB', { error: err.message, type, message });
  }
}

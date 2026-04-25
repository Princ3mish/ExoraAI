import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Phase 6: Events Controller
 * GET /api/events — Returns AIEvent records for real-time frontend polling.
 *
 * Query params:
 *   ?since=<ISO string>  — Return only events after this timestamp (efficient incremental polling)
 *   ?limit=<number>      — Max events to return (default: 50, max: 100)
 *
 * Structured for future SSE migration:
 * - SSE path: GET /api/events/stream with Content-Type: text/event-stream
 * - This JSON polling path stays as GET /api/events
 */
export const getEvents = async (req, res, next) => {
  try {
    const { since, limit } = req.query;
    const take = Math.min(parseInt(limit) || 50, 100);

    const where = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const events = await prisma.aIEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    // DB returns newest-first; reverse for chronological display in UI
    const chronological = events.reverse();

    res.json({
      success: true,
      data: {
        events: chronological,
        total: chronological.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('[EventsController] Failed to fetch events', { error: err.message });
    next(err);
  }
};

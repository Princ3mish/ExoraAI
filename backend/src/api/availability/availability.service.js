import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Phase 3: Availability Service
 * Implements an atomic delete-and-insert (upsert) pattern within a Prisma transaction
 * to replace all availability slots for the authenticated user.
 * All operations are strictly scoped to the userId from req.user — no cross-user access.
 */

export const upsertAvailabilities = async (userId, slots) => {
  // Validate slot integrity before touching the DB
  for (const slot of slots) {
    if (new Date(slot.endTime) <= new Date(slot.startTime)) {
      const err = new Error(`endTime must be after startTime for slot starting at ${slot.startTime}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete all existing slots for this user
    await tx.availability.deleteMany({ where: { userId } });

    // Insert the new slot set
    const created = await tx.availability.createMany({
      data: slots.map(({ startTime, endTime }) => ({
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      })),
    });

    return created;
  });

  logger.info(`Availability upserted for user ${userId}: ${result.count} slot(s)`);
  return result;
};

export const getAvailabilities = async (userId) => {
  return prisma.availability.findMany({
    where: { userId },
    orderBy: { startTime: 'asc' },
    select: { id: true, startTime: true, endTime: true },
  });
};

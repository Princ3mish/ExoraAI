/**
 * Phase S2: Credits Middleware
 *
 * requireCredits(cost) — Express middleware factory.
 *   - Pro plan users bypass all credit checks.
 *   - Free/paid users must have >= cost credits; returns 402 if insufficient.
 *
 * deductCredits(userId, amount, reason) — helper called AFTER a successful action.
 *   - Decrements credits atomically via Prisma update.
 *   - Never throws (errors are logged, not propagated).
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Middleware factory — gates a route behind a credit check.
 *
 * Usage in routes:
 *   router.post('/', authenticate, requireCredits(1), controller.create);
 *
 * @param {number} cost - credits required for this action
 */
export const requireCredits = (cost) => async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, plan: true },
    });

    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    // Pro plan bypasses ALL credit checks
    if (user.plan === 'pro') {
      return next();
    }

    if (user.credits < cost) {
      logger.warn(`[requireCredits] Insufficient credits for user ${userId}: has ${user.credits}, needs ${cost}`);
      const err = new Error('Insufficient credits. Please purchase more credits to continue.');
      err.statusCode = 402;
      return next(err);
    }

    // Attach user plan info for downstream use
    req.userCredits = user.credits;
    req.userPlan = user.plan;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Deduct credits AFTER a successful action (fire-and-forget safe).
 * Never throws — errors are caught and logged only.
 *
 * @param {string} userId
 * @param {number} amount - credits to deduct
 * @param {string} [reason] - optional label for logging
 */
export const deductCredits = async (userId, amount, reason = 'action') => {
  try {
    // Check plan first — pro users are never debited
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, credits: true },
    });

    if (!user || user.plan === 'pro') return;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    // Phase S4 — create audit trail transaction record
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: 'deduction',
        reason,
      },
    });

    logger.info(`[deductCredits] User ${userId} debited ${amount} credit(s) for "${reason}". Remaining: ${updated.credits}`);
  } catch (err) {
    logger.error(`[deductCredits] Failed to deduct credits for user ${userId}: ${err.message}`);
  }
};


/**
 * Phase S4: Billing Controller
 */

import * as billingService from './billing.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * POST /api/billing/create-checkout
 * Requires auth. Creates a Stripe Checkout session and returns the redirect URL.
 */
export const createCheckout = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  logger.info('[Billing] createCheckout called', { userId, hasUser: !!req.user });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  logger.info('[Billing] Calling createCheckoutSession', { userId, email: user.email });

  try {
    const { url } = await billingService.createCheckoutSession(userId, user.email);
    res.json({ url });
  } catch (err) {
    logger.error('[Billing] createCheckout failed', {
      error: err.message,
      stack: err.stack,
      userId,
    });
    // Surface real error message so the client can show a useful notification
    res.status(err.statusCode || 500).json({
      error: 'Checkout failed',
      message: err.message,
    });
  }
});

/**
 * POST /api/billing/webhook
 * NO auth — Stripe calls this directly.
 * CRITICAL: req.body must be a raw Buffer (not parsed JSON).
 */
export const webhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const result = await billingService.handleWebhook(req.body, signature);
  res.json(result);
});

/**
 * GET /api/billing/history
 * Requires auth. Returns last 20 credit transactions.
 */
export const getHistory = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const transactions = await billingService.getCreditHistory(userId);
  res.json({ status: 200, data: { transactions } });
});


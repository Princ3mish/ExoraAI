/**
 * Phase S4: Billing Service
 *
 * createCheckoutSession — creates a Stripe Checkout session for 50 credits ($10)
 * handleWebhook        — verifies Stripe signature, adds credits + logs transaction
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

// ─── Startup env validation ───────────────────────────────────────────────────
if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('[Billing] STRIPE_SECRET_KEY is not set — billing will be unavailable');
}
if (!process.env.STRIPE_PRICE_ID) {
  logger.warn('[Billing] STRIPE_PRICE_ID is not set — checkout sessions cannot be created');
}
if (!process.env.FRONTEND_URL) {
  logger.warn('[Billing] FRONTEND_URL is not set — falling back to http://localhost:5173');
}
logger.info('[Billing] Stripe price ID:', { priceId: process.env.STRIPE_PRICE_ID });

/**
 * Lazily initialise the Stripe client.
 * Stripe SDK v16+ requires an explicit apiVersion — omitting it throws at runtime.
 * Throws a clear 500-level error if the secret key is missing at call time.
 */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error(
      'Stripe is not configured — STRIPE_SECRET_KEY is missing. Restart the server after setting it in .env.',
    );
    err.statusCode = 500;
    throw err;
  }
  // apiVersion is required in Stripe SDK v16+. Without it the constructor throws.
  // v22 aligns with '2026-03-25.dahlia' — must match the SDK's bundled types.
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

/**
 * Create a Stripe Checkout session for the credit purchase.
 *
 * @param {string} userId
 * @param {string} userEmail
 * @returns {{ url: string, sessionId: string }}
 */
export const createCheckoutSession = async (userId, userEmail) => {
  const stripe = getStripe();

  const priceId = process.env.STRIPE_PRICE_ID;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!priceId) {
    const err = new Error('STRIPE_PRICE_ID is not configured.');
    err.statusCode = 500;
    throw err;
  }

  logger.info('[Billing] Creating checkout session', { userId, userEmail, priceId });

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        credits: '50',
        type: 'credit_purchase',
      },
      success_url: `${frontendUrl}/dashboard/billing?success=true`,
      cancel_url: `${frontendUrl}/dashboard/billing?cancelled=true`,
    });
  } catch (stripeErr) {
    logger.error('[Billing] Stripe session creation failed', {
      error: stripeErr.message,
      type: stripeErr.type,
      code: stripeErr.code,
      userId,
    });
    throw stripeErr;
  }

  logger.info('[Billing] Checkout session created', { sessionId: session.id, userId });
  return { url: session.url, sessionId: session.id };
};

/**
 * Verify and handle an incoming Stripe webhook event.
 * Only processes checkout.session.completed to add credits.
 *
 * @param {Buffer} rawBody  — raw request body (must NOT be JSON-parsed)
 * @param {string} signature — value of stripe-signature header
 * @returns {{ received: boolean }}
 */
export const handleWebhook = async (rawBody, signature) => {
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn(`[Billing] Webhook signature verification failed: ${err.message}`);
    const verifyErr = new Error(`Webhook Error: ${err.message}`);
    verifyErr.statusCode = 400;
    throw verifyErr;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, credits } = session.metadata ?? {};

    if (!userId || !credits) {
      logger.warn('[Billing] Webhook missing userId or credits in metadata', {
        sessionId: session.id,
      });
      return { received: true };
    }

    const creditAmount = parseInt(credits, 10);

    // Atomically increment credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: creditAmount } },
    });

    // Create audit trail record
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: creditAmount,
        type: 'purchase',
        reason: 'credit_purchase',
        stripeSessionId: session.id,
      },
    });

    logger.info('[Billing] Credits added', {
      userId,
      credits: creditAmount,
      sessionId: session.id,
    });
  }

  return { received: true };
};

/**
 * Return the last 20 credit transactions for a user.
 *
 * @param {string} userId
 * @returns {CreditTransaction[]}
 */
export const getCreditHistory = async (userId) => {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

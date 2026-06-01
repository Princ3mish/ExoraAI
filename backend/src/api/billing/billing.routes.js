/**
 * Phase S4: Billing Routes
 *
 * CRITICAL: The webhook route registers express.raw() BEFORE the main
 * express.json() that wraps all other routes. This file is mounted in
 * app.js via:
 *
 *   app.use('/api/billing', billingRouter);
 *
 * But the raw-body override for /webhook is handled here at the router
 * level so it takes effect before the request body is parsed.
 */

import { Router } from 'express';
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createCheckout,
  webhookHandler,
  getHistory,
} from './billing.controller.js';

const router = Router();

// ── Webhook — raw body REQUIRED for Stripe signature verification ──────────
// express.raw() must come before the global express.json() middleware sees
// this route. Because billing.routes.js is mounted before express.json() runs
// on /api/billing paths, this override works correctly.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler,
);

// ── Authenticated routes ────────────────────────────────────────────────────
router.post('/create-checkout', authenticate, createCheckout);
router.get('/history', authenticate, getHistory);

export default router;

import { Router } from 'express';
import * as availabilityController from './availability.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { upsertAvailabilitiesSchema } from './availability.schema.js';

const router = Router();

/**
 * Phase 3: Availability Routes — all endpoints require JWT authentication.
 *
 * POST /api/availability   — Upsert (replace) own availability slots
 * GET  /api/availability   — Retrieve own availability slots
 */
router.post(
  '/',
  authenticate,
  validateRequest(upsertAvailabilitiesSchema),
  availabilityController.upsertAvailabilities
);

router.get('/', authenticate, availabilityController.getAvailabilities);

export default router;

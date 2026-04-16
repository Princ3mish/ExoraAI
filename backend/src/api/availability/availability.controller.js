import * as availabilityService from './availability.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Phase 3: Availability Controller — thin HTTP adapter.
 * All business logic delegated to availabilityService.
 */

export const upsertAvailabilities = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { slots } = req.body;
  const result = await availabilityService.upsertAvailabilities(userId, slots);
  res.status(200).json({
    status: 200,
    message: `Availability updated: ${result.count} slot(s) saved.`,
    data: { count: result.count },
  });
});

export const getAvailabilities = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const slots = await availabilityService.getAvailabilities(userId);
  res.status(200).json({ status: 200, message: 'Availability retrieved.', data: slots });
});

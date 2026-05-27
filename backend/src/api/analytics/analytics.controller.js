import * as analyticsService from './analytics.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Controller to handle API request for fetching analytics summaries
 * GET /api/analytics/summary
 */
export const getSummary = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const { from, to } = req.query;

  const data = await analyticsService.getSummary(userId, role, { from, to });
  
  res.status(200).json({
    status: 200,
    message: 'Analytics summary retrieved successfully.',
    data,
  });
});

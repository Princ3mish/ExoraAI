// Phase 2: Controllers defining clean edge interfaces for client interactions
import * as meetingsService from './meetings.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getMeetings = asyncHandler(async (req, res) => {
  // Delegate actual lookup to isolated domain layers
  const data = await meetingsService.scaffoldMeetingsService();
  res.status(200).json({ status: 200, message: "Meetings fetched (dummy)", data: [data] });
});

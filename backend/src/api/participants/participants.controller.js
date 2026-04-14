// Phase 2: Handle participant HTTP lifecycle separate from core code handling
import * as participantsService from './participants.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getParticipants = asyncHandler(async (req, res) => {
  // Phase 2: Forward structural handling to encapsulated logic module
  const data = await participantsService.scaffoldParticipantsService();
  res.status(200).json({ status: 200, message: "Participants fetched (dummy)", data: [data] });
});

// Phase 2: Handle participant HTTP lifecycle separate from core code handling
import * as participantsService from './participants.service.js';

export const getParticipants = async (req, res, next) => {
  try {
    // Phase 2: Forward structural handling to encapsulated logic module
    const data = await participantsService.scaffoldParticipantsService();
    res.status(200).json({ status: 200, message: "Participants fetched (dummy)", data: [data] });
  } catch (error) {
    // Phase 2: Hand off unhandled internal throws reliably
    next(error);
  }
};

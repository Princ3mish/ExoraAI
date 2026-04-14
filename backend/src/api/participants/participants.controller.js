import * as participantsService from './participants.service.js';

export const getParticipants = async (req, res, next) => {
  try {
    const data = await participantsService.scaffoldParticipantsService();
    res.status(200).json({ status: 200, message: "Participants fetched (dummy)", data: [data] });
  } catch (error) {
    next(error);
  }
};

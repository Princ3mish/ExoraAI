import * as meetingsService from './meetings.service.js';

export const getMeetings = async (req, res, next) => {
  try {
    const data = await meetingsService.scaffoldMeetingsService();
    res.status(200).json({ status: 200, message: "Meetings fetched (dummy)", data: [data] });
  } catch (error) {
    next(error);
  }
};

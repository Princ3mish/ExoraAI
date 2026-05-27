import * as meetingsService from './meetings.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Phase 3: Meetings Controller — thin HTTP adapter.
 * All business logic, conflict detection, and DB interaction lives in meetingsService.
 *
 * Phase R1 addition:
 *   GET /api/meetings/calendar — returns meetings formatted for a timeline view.
 */

export const createMeeting = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const meeting = await meetingsService.createMeeting(userId, req.body);
  res.status(201).json({ status: 201, message: 'Meeting created successfully.', data: meeting });
});

export const getMeetings = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const meetings = await meetingsService.getMeetings(userId, role);
  res.status(200).json({ status: 200, message: 'Meetings retrieved.', data: meetings });
});

export const respondToInvite = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { id: meetingId } = req.params;
  const { status } = req.body;
  const result = await meetingsService.respondToInvite(meetingId, userId, status);
  res.status(200).json({ status: 200, ...result });
});

export const getMeetingById = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const { id: meetingId } = req.params;
  const meeting = await meetingsService.getMeetingById(meetingId, userId, role);
  res.status(200).json({ status: 200, message: 'Meeting retrieved.', data: meeting });
});

export const updateMeeting = asyncHandler(async (req, res) => {
  const { id: meetingId } = req.params;
  const meeting = await meetingsService.updateMeeting(meetingId, req.body);
  res.status(200).json({ status: 200, message: 'Meeting updated successfully.', data: meeting });
});

export const deleteMeeting = asyncHandler(async (req, res) => {
  const { id: meetingId } = req.params;
  const result = await meetingsService.deleteMeeting(meetingId);
  res.status(200).json({ status: 200, message: 'Meeting deleted successfully.', data: result });
});

/**
 * Phase R1: GET /api/meetings/calendar
 * Returns meetings shaped for a timeline / calendar view.
 * Query params:
 *   ?from=<ISO>  — start of window (default: start of current day)
 *   ?to=<ISO>    — end of window   (default: 30 days from now)
 */
export const getCalendar = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const { from, to } = req.query;
  const data = await meetingsService.getCalendarMeetings(userId, role, { from, to });
  res.status(200).json({ status: 200, message: 'Calendar meetings retrieved.', data });
});

export const deleteAllMeetings = asyncHandler(async (req, res) => {
  const result = await meetingsService.deleteAllMeetings();
  res.status(200).json({ status: 200, message: 'All meetings deleted successfully.', data: result });
});

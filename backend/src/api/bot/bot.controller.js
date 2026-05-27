import * as botService from './bot.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Phase R1: Bot Controller — thin HTTP adapter for BotSession endpoints.
 * All business logic lives in bot.service.js.
 *
 * Routes:
 *   GET    /api/bot/session     — List 10 most recent sessions (Issue 3 fix)
 *   POST   /api/bot/session     — Create a new BotSession
 *   PATCH  /api/bot/session/:id — Merge updated slots into existing BotSession
 */

/**
 * GET /api/bot/session
 * Returns the 10 most recent BotSession records for the authenticated user.
 * Always returns 200 with an array — never 404.
 */
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await botService.getSessions();
  res.status(200).json({ status: 200, data: sessions });
});

/**
 * POST /api/bot/session
 * Body: { telegramId, intent?, slots?, meetingId? }
 */
export const createSession = asyncHandler(async (req, res) => {
  const { telegramId, intent, slots, meetingId } = req.body;
  const session = await botService.createSession({ telegramId, intent, slots, meetingId });
  res.status(201).json({ status: 201, message: 'Bot session created.', data: session });
});

/**
 * PATCH /api/bot/session/:id
 * Body: { slots?, intent?, status?, meetingId? }
 */
export const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slots, intent, status, meetingId } = req.body;
  const session = await botService.updateSession(id, { slots, intent, status, meetingId });
  res.status(200).json({ status: 200, message: 'Bot session updated.', data: session });
});

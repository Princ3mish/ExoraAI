import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Phase 3: Auth Controller — thin HTTP layer. Delegates all logic to authService.
 * Returns structured JSON; errors propagate via next() to the global errorHandler.
 */

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json({ status: 201, message: 'Account created successfully.', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json({ status: 200, message: 'Login successful.', data: result });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.userId);
  res.status(200).json({ status: 200, data: { user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { userId } = req.user;
  await authService.changePassword(userId, { currentPassword, newPassword });
  res.status(200).json({ status: 200, message: 'Password updated successfully.' });
});

// Phase S1 — Telegram linking

export const telegramToken = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await authService.getTelegramToken(userId);
  // Never include the raw token in logs — botUrl already contains it, which is OK
  res.status(200).json({ status: 200, data: result });
});

export const telegramStatus = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await authService.getTelegramStatus(userId);
  res.status(200).json({ status: 200, data: result });
});

import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Phase 3: Auth Controller — thin HTTP layer. Delegates all logic to authService.
 * Returns structured JSON; errors propagate via next() to the global errorHandler.
 */

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).json({ status: 201, message: 'Account created successfully.', data: user });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json({ status: 200, message: 'Login successful.', data: result });
});

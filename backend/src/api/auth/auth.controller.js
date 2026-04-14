// Phase 2: Controller layer properly mapping HTTP lifecycle request interfaces securely towards service business code
import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  // Escalate actual business logic out of the controller
  const data = await authService.scaffoldAuthService();
  res.status(200).json({ status: 200, message: "Login successful (dummy)", data });
});

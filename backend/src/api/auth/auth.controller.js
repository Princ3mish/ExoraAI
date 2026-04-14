// Phase 2: Controller layer properly mapping HTTP lifecycle request interfaces securely towards service business code
import * as authService from './auth.service.js';

export const login = async (req, res, next) => {
  try {
    // Escalate actual business logic out of the controller
    const data = await authService.scaffoldAuthService();
    res.status(200).json({ status: 200, message: "Login successful (dummy)", data });
  } catch (error) {
    // Phase 2: Ensure controller errors propagate into the global catch blocks cleanly
    next(error);
  }
};

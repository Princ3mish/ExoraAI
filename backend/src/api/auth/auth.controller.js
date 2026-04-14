import * as authService from './auth.service.js';

export const login = async (req, res, next) => {
  try {
    const data = await authService.scaffoldAuthService();
    res.status(200).json({ status: 200, message: "Login successful (dummy)", data });
  } catch (error) {
    next(error);
  }
};

// Phase 2: Controller wrapping HTTP constraints around scalable service functions
import * as usersService from './users.service.js';

export const getUsers = async (req, res, next) => {
  try {
    // Decoupled extraction of database code
    const data = await usersService.scaffoldUsersService();
    res.status(200).json({ status: 200, message: "Users fetched (dummy)", data: [data] });
  } catch (error) {
    // Safe failure delegation into Express Error router
    next(error);
  }
};

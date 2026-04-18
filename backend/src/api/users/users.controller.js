// Phase 2: Controller wrapping HTTP constraints around scalable service functions
import * as usersService from './users.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  // Decoupled extraction of database code
  const data = await usersService.scaffoldUsersService();
  res.status(200).json({ status: 200, message: "Users fetched (dummy)", data: [data] });
});

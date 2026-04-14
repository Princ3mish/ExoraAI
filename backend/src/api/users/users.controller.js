import * as usersService from './users.service.js';

export const getUsers = async (req, res, next) => {
  try {
    const data = await usersService.scaffoldUsersService();
    res.status(200).json({ status: 200, message: "Users fetched (dummy)", data: [data] });
  } catch (error) {
    next(error);
  }
};

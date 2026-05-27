import * as usersService from './users.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const currentUserId = req.user?.userId; // Assuming authenticate middleware sets req.user
  
  if (search) {
    const data = await usersService.searchUsers(search, currentUserId);
    return res.status(200).json({ status: 200, message: "Users fetched", data });
  }

  // Fallback if no search query
  res.status(200).json({ status: 200, message: "Users fetched", data: [] });
});

export const getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await usersService.getUserProfile(userId);
  res.status(200).json({ status: 200, data: { user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { name, phoneNumber } = req.body;
  const user = await usersService.updateUserProfile(userId, { name, phoneNumber });
  res.status(200).json({ status: 200, message: "Profile updated successfully.", data: { user } });
});

export const updateUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber } = req.body;
  const user = await usersService.updateUserProfile(id, { name, phoneNumber });
  res.status(200).json({ status: 200, message: "User updated successfully.", data: { user } });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  await usersService.deleteUser(userId);
  res.status(200).json({ status: 200, message: "Account deleted successfully." });
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const searchUsers = async (searchQuery, currentUserId) => {
  if (!searchQuery || searchQuery.trim().length === 0) return [];
  
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
    take: 10,
  });
  
  return users;
};

export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

export const updateUserProfile = async (userId, { name, phoneNumber }) => {
  return prisma.user.update({
    where: { id: userId },
    data: { name, phoneNumber },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true },
  });
};

export const deleteUser = async (userId) => {
  return prisma.user.delete({
    where: { id: userId }
  });
};

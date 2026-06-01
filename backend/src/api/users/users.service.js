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
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      credits: true,
      plan: true,
      telegramLinked: true,
    },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // Compute usage stats for the current calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [meetingsThisMonth, contactsTotal, voiceCallsThisMonth] = await Promise.all([
    prisma.meeting.count({
      where: { organizerId: userId, createdAt: { gte: monthStart } },
    }),
    prisma.userContact.count({ where: { ownerId: userId } }),
    prisma.voiceCallLog.count({
      where: {
        meeting: { organizerId: userId },
        calledAt: { gte: monthStart },
      },
    }),
  ]);

  const isPro = user.plan === 'pro';
  const { FREE_TIER_LIMITS } = await import('../../utils/limits.js');

  return {
    ...user,
    usage: {
      meetingsThisMonth,
      meetingsLimit:     isPro ? null : FREE_TIER_LIMITS.meetings,
      contactsTotal,
      contactsLimit:     isPro ? null : FREE_TIER_LIMITS.contacts,
      voiceCallsThisMonth,
      voiceCallsLimit:   isPro ? null : FREE_TIER_LIMITS.voiceCalls,
    },
  };
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

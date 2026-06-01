/**
 * Phase S2: Usage Limits Utility
 *
 * FREE_TIER_LIMITS — constants for free-plan restrictions.
 * checkMonthlyLimit(userId, type) — queries DB and returns { allowed, used, limit }.
 *
 * Pro plan users always get { allowed: true, used: N, limit: Infinity }.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const FREE_TIER_LIMITS = {
  meetings: 5,     // meetings per calendar month
  contacts: 5,     // total contacts stored
  voiceCalls: 5,   // voice calls per calendar month
};

/**
 * Check if a user is within their monthly (or total) limit for a given resource type.
 *
 * @param {string} userId
 * @param {'meetings'|'voiceCalls'|'contacts'} type
 * @returns {Promise<{ allowed: boolean, used: number, limit: number }>}
 */
export const checkMonthlyLimit = async (userId, type) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    return { allowed: false, used: 0, limit: 0 };
  }

  // Pro plan — always allowed
  if (user.plan === 'pro') {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let used = 0;
  let limit = 0;

  if (type === 'meetings') {
    limit = FREE_TIER_LIMITS.meetings;
    used = await prisma.meeting.count({
      where: {
        organizerId: userId,
        createdAt: { gte: monthStart },
      },
    });
  } else if (type === 'voiceCalls') {
    limit = FREE_TIER_LIMITS.voiceCalls;
    // Count voice calls triggered by meetings this user organised
    used = await prisma.voiceCallLog.count({
      where: {
        meeting: { organizerId: userId },
        calledAt: { gte: monthStart },
      },
    });
  } else if (type === 'contacts') {
    limit = FREE_TIER_LIMITS.contacts;
    // Contacts are cumulative, not monthly
    used = await prisma.userContact.count({
      where: { ownerId: userId },
    });
  }

  return { allowed: used < limit, used, limit };
};

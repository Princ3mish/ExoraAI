import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service to fetch and compute aggregated meeting and AI agent metrics
 * @param {string} userId - ID of calling user for scoping
 * @param {string} role - USER or ADMIN
 * @param {object} dateRange - { from?: string, to?: string }
 * @returns {Promise<object>} Summary analytics dashboard payload
 */
export const getSummary = async (userId, role, { from, to }) => {
  const now = new Date();
  
  // Parse dates with proper range handling.
  // Defaults to last 30 days if not provided.
  const windowEnd = to ? new Date(to) : new Date(now);
  const windowStart = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
    const err = new Error('Invalid date parameters. Use ISO formats.');
    err.statusCode = 400;
    throw err;
  }

  // ── 1. Meetings Query scoping ──────────────────────────────────────────────
  const meetingFilter = {
    startTime: {
      gte: windowStart,
      lte: windowEnd,
    },
  };

  if (role !== 'ADMIN') {
    meetingFilter.OR = [
      { organizerId: userId },
      { participants: { some: { userId } } },
    ];
  }

  const meetings = await prisma.meeting.findMany({
    where: meetingFilter,
    include: {
      participants: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  const totalMeetings = meetings.length;

  // ── 2. Time-window comparison metrics ──────────────────────────────────────
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const thisWeekMeetings = meetings.filter((m) => m.startTime >= weekStart);
  const thisMonthMeetings = meetings.filter((m) => m.startTime >= monthStart);

  // Fetch count for last week for "vs last week" comparison card subtext
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const lastWeekFilter = {
    startTime: {
      gte: twoWeeksAgo,
      lt: weekStart,
    },
  };

  if (role !== 'ADMIN') {
    lastWeekFilter.OR = [
      { organizerId: userId },
      { participants: { some: { userId } } },
    ];
  }

  const lastWeekMeetingsCount = await prisma.meeting.count({ where: lastWeekFilter });

  // ── 3. Confirmation rate ───────────────────────────────────────────────────
  // meetings with confirmationStatus === 'confirmed'
  const confirmedMeetings = meetings.filter((m) => m.confirmationStatus === 'confirmed');
  const confirmationRate = totalMeetings > 0 
    ? Math.round((confirmedMeetings.length / totalMeetings) * 100) 
    : 0;

  // ── 4. Voice Calls query & breakdown ──────────────────────────────────────
  const voiceCallFilter = {
    calledAt: {
      gte: windowStart,
      lte: windowEnd,
    },
  };

  if (role !== 'ADMIN') {
    voiceCallFilter.meeting = {
      OR: [
        { organizerId: userId },
        { participants: { some: { userId } } },
      ],
    };
  }

  const voiceCallLogs = await prisma.voiceCallLog.findMany({
    where: voiceCallFilter,
  });

  const totalCalls = voiceCallLogs.length;

  const voiceCallBreakdown = { completed: 0, failed: 0, pending: 0, skipped: 0 };
  for (const log of voiceCallLogs) {
    const o = (log.outcome || 'pending').toLowerCase();
    if (o === 'completed' || o === 'success') {
      voiceCallBreakdown.completed++;
    } else if (o === 'failed' || o === 'error') {
      voiceCallBreakdown.failed++;
    } else if (o === 'pending') {
      voiceCallBreakdown.pending++;
    } else if (o === 'skipped') {
      voiceCallBreakdown.skipped++;
    } else {
      voiceCallBreakdown.failed++; // default fallback for arbitrary errors
    }
  }

  // Success rate: completed call percentage
  const voiceCallSuccessRate = totalCalls > 0 
    ? Math.round((voiceCallBreakdown.completed / totalCalls) * 100) 
    : 0;

  // Overview payload formatting
  const overview = {
    totalMeetings,
    thisWeek: thisWeekMeetings.length,
    lastWeek: lastWeekMeetingsCount, // helper comparison field
    thisMonth: thisMonthMeetings.length,
    confirmationRate,
    voiceCallSuccessRate,
    totalCalls,
  };

  // ── 5. Status Breakdown ────────────────────────────────────────────────────
  const statusBreakdown = { confirmed: 0, unconfirmed: 0, cancelled: 0 };
  for (const m of meetings) {
    if (m.status === 'CONFIRMED') {
      statusBreakdown.confirmed++;
    } else if (m.status === 'PENDING') {
      statusBreakdown.unconfirmed++;
    } else if (m.status === 'CANCELLED') {
      statusBreakdown.cancelled++;
    }
  }

  // ── 6. Top Participants Aggregation ────────────────────────────────────────
  const participantCounts = {};
  for (const m of meetings) {
    for (const p of m.participants) {
      if (!p.user) continue;
      const key = p.userId;
      if (!participantCounts[key]) {
        participantCounts[key] = {
          name: p.user.name || 'Unknown User',
          email: p.user.email || '',
          meetingCount: 0,
        };
      }
      participantCounts[key].meetingCount++;
    }
  }

  const topParticipants = Object.values(participantCounts)
    .sort((a, b) => b.meetingCount - a.meetingCount)
    .slice(0, 5);

  // ── 7. Daily Timeline Aggregation ──────────────────────────────────────────
  const meetingsPerDay = [];
  const startDay = new Date(windowStart.getTime());
  startDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(windowEnd.getTime());
  endDay.setUTCHours(23, 59, 59, 999);

  // Fill in sequential dates with default zero count to ensure Recharts does not break
  for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    meetingsPerDay.push({ date: dateStr, count: 0 });
  }

  for (const m of meetings) {
    const dateStr = m.startTime.toISOString().split('T')[0];
    const dayObj = meetingsPerDay.find((day) => day.date === dateStr);
    if (dayObj) {
      dayObj.count++;
    }
  }

  // ── 8. Recent Activity Feed ────────────────────────────────────────────────
  const eventFilter = {
    createdAt: {
      gte: windowStart,
      lte: windowEnd,
    },
  };

  if (role !== 'ADMIN') {
    eventFilter.OR = [
      { userId },
      {
        meeting: {
          OR: [
            { organizerId: userId },
            { participants: { some: { userId } } },
          ],
        },
      },
    ];
  }

  const events = await prisma.aIEvent.findMany({
    where: eventFilter,
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentActivity = events.map((e) => {
    let type = 'bot';
    const msg = (e.message || '').toLowerCase();
    
    if (e.type === 'SYSTEM' || e.type === 'USER_RESPONSE') {
      type = 'meeting';
    } else if (e.type === 'VOICE_CALL' || msg.includes('voice') || msg.includes('phone') || msg.includes('call')) {
      type = 'voice';
    }
    
    return {
      date: e.createdAt.toISOString(),
      type,
      description: e.message || 'No action description available',
    };
  });

  return {
    overview,
    meetingsPerDay,
    statusBreakdown,
    voiceCallBreakdown,
    topParticipants,
    recentActivity,
  };
};

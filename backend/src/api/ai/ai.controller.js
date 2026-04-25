import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateCompletion, preProcessAvailability } from '../../services/ai.service.js';
import { TASK_TYPES } from '../../utils/ai.prompts.js';
import logger from '../../utils/logger.js';
import { logEvent } from '../../utils/logEvent.js';
import * as groqProvider from '../../services/providers/groq.provider.js';
import * as openrouterProvider from '../../services/providers/openrouter.provider.js';

const prisma = new PrismaClient();

/**
 * Phase 4: AI Controller — thin HTTP adapter.
 * All AI logic, prompt construction, fallback handling, and response
 * normalisation live in ai.service.js.
 */

// ── GET /api/ai/suggest-times/:meetingId (ADMIN only) ───────────────────────

export const suggestTimes = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { userId } = req.user;

  // Fetch meeting + participants
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: { select: { userId: true } },
    },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // Aggregate availability for every participant
  const participantUserIds = meeting.participants.map((p) => p.userId);
  const availabilities = await prisma.availability.findMany({
    where: { userId: { in: participantUserIds } },
    select: { userId: true, startTime: true, endTime: true },
  });

  // Group by user
  const grouped = {};
  for (const a of availabilities) {
    if (!grouped[a.userId]) grouped[a.userId] = [];
    grouped[a.userId].push({ start: a.startTime, end: a.endTime });
  }
  const availabilityByUser = Object.entries(grouped).map(([uid, slots]) => ({
    userId: uid,
    slots,
  }));

  // Pre-process: deterministic filtering
  const durationMinutes = Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / 60_000);
  const filtered = preProcessAvailability(availabilityByUser, durationMinutes);

  // AI call
  const data = await generateCompletion({
    taskType: TASK_TYPES.SUGGEST_TIMES,
    input: {
      meetingTitle: meeting.title,
      durationMinutes,
      availabilityByUser: filtered,
    },
    metadata: { userId, meetingId, endpoint: 'GET /api/ai/suggest-times' },
  });

  res.status(200).json({
    status: 200,
    message: 'Time suggestions generated.',
    data,
  });
});

// ── POST /api/ai/draft-email (ADMIN only) ───────────────────────────────────

export const draftEmail = asyncHandler(async (req, res) => {
  const { meetingId, contextType } = req.body;
  const { userId } = req.user;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const participants = meeting.participants.map((p) => ({
    name: p.user.name,
    email: p.user.email,
  }));

  const data = await generateCompletion({
    taskType: TASK_TYPES.DRAFT_EMAIL,
    input: {
      contextType,
      meeting: {
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
      },
      participants,
    },
    metadata: { userId, meetingId, endpoint: 'POST /api/ai/draft-email' },
  });

  res.status(200).json({
    status: 200,
    message: 'Email draft generated.',
    data,
  });
});

// ── POST /api/ai/summary (ADMIN or USER) ────────────────────────────────────

export const summary = asyncHandler(async (req, res) => {
  const { meetingId, notes } = req.body;
  const { userId, role } = req.user;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: { select: { userId: true } } },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  // Access check for non-admin: must be participant or organizer
  if (role !== 'ADMIN') {
    const isParticipant = meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant && meeting.organizerId !== userId) {
      const err = new Error('You do not have permission to summarize this meeting.');
      err.statusCode = 403;
      throw err;
    }
  }

  const data = await generateCompletion({
    taskType: TASK_TYPES.SUMMARIZE_MEETING,
    input: {
      meeting: {
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
      },
      notes,
    },
    metadata: { userId, meetingId, endpoint: 'POST /api/ai/summary' },
  });

  res.status(200).json({
    status: 200,
    message: 'Meeting summary generated.',
    data,
  });
});

// ── POST /api/ai/simulate-call (ADMIN only) ──────────────────────────────────

export const simulateCall = asyncHandler(async (req, res) => {
  const { meetingId, participantName, participantEmail } = req.body;
  const { userId } = req.user;

  // Log initiation
  await logEvent({
    type: 'SIMULATION',
    message: `Initiating AI call to ${participantName} (${participantEmail})\u2026`,
    status: 'pending',
    meetingId,
    userId,
    metadata: { participantName, participantEmail },
  });

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, startTime: true, endTime: true },
  });

  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const systemPrompt = 'You are a call script generator. Output ONLY valid JSON — no markdown, no explanation.';
  const userPrompt = `Generate a realistic phone call script between an AI scheduler named "Exora" and ${participantName} about the meeting "${meeting.title}" scheduled ${meeting.startTime.toISOString()} to ${meeting.endTime.toISOString()}. Exora is checking if ${participantName} can attend and resolving any concerns. Return JSON: {"script":[{"speaker":"Exora","line":"..."},{"speaker":"${participantName}","line":"..."}]} with 6-8 alternating turns.`;

  let script = [];
  try {
    let result;
    try {
      result = await groqProvider.generateCompletion(userPrompt, systemPrompt);
    } catch {
      result = await openrouterProvider.generateCompletion(userPrompt, systemPrompt);
    }

    let cleaned = result.content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    script = parsed.script || [];
  } catch {
    // Fallback script
    script = [
      { speaker: 'Exora', line: `Hello ${participantName}, this is Exora AI calling about the meeting "${meeting.title}".` },
      { speaker: participantName, line: 'Yes, I received the invitation. What can I help you with?' },
      { speaker: 'Exora', line: `The meeting is scheduled for ${meeting.startTime.toISOString()}. Are you available?` },
      { speaker: participantName, line: 'Let me check... Yes, that time works for me.' },
      { speaker: 'Exora', line: 'Wonderful! I will mark you as confirmed. Is there anything you would like to discuss beforehand?' },
      { speaker: participantName, line: 'No, I think I have everything I need. Thank you for checking!' },
    ];
  }

  await logEvent({
    type: 'SIMULATION',
    message: `Call script generated for ${participantName} \u2014 ${script.length} turns`,
    status: 'success',
    meetingId,
    userId,
    metadata: { participantName, turnCount: script.length },
  });

  res.status(200).json({
    status: 200,
    message: 'Call simulation script generated.',
    data: { script, participantName, meetingId },
  });
});

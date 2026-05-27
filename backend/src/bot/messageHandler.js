import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { logEvent } from '../utils/logEvent.js';
import { sendBulkEmail } from '../services/email.service.js';
import { extractIntent } from './intentHandler.js';
import {
  loadSession,
  saveSession,
  clearSession,
  getMissingSlots,
  SLOT_QUESTIONS,
  getSlotQuestion,
} from './sessionManager.js';

const prisma = new PrismaClient();

/**
 * Phase R2: Message Handler — the conversation routing brain.
 *
 * Every non-command Telegram message flows through here.
 * Implements a slot-filling loop:
 *
 *   1. Load existing session
 *   2. If no session → run intent extraction → create session
 *   3. If session + missing slots → treat message as slot answer, merge, ask next
 *   4. If session in 'confirming' state → handle yes / change / cancel
 *   5. Once all required slots filled → ask for confirmation
 *   6. On confirmation → create Meeting in DB → send emails → clear session
 *
 * @param {object} opts
 * @param {string|number} opts.telegramId
 * @param {string}        opts.text
 * @returns {Promise<string>} Reply text to send back (Markdown safe)
 */
export async function handleMessage({ telegramId, text }) {
  const tidStr = String(telegramId);

  // ── 0. Gate check: user must have linked their Telegram account ──────────────
  const linkedUser = await prisma.user.findFirst({
    where: { telegramId: tidStr, telegramLinked: true },
    select: { id: true, name: true, email: true },
  });

  if (!linkedUser) {
    return (
      `🔗 Your Telegram isn't connected to an Exora AI account yet.\n\n` +
      `Visit your dashboard and click <b>"Connect Telegram"</b> to get started in 30 seconds.`
    );
  }

  // ── 1. Load existing session ────────────────────────────────────────────────
  let session = await loadSession(telegramId);

  // ── 2. Handle "confirming" state (yes / change / cancel) ───────────────────
  if (session?.status === 'confirming') {
    logger.info('[MessageHandler] In confirming state', { telegramId: tidStr, text });
    return handleConfirmationReply({ telegramId, text, session });
  }

  // ── 3. If active session with missing slots, treat message as slot answer ───
  if (session?.status === 'active') {
    const currentSlots = session.slots || {};

    // ── 3a. Pending participant email retry ─────────────────────────────────
    // If a previous lookup couldn't resolve a name, we stored it here and
    // asked the user for an email. Their next message is that email.
    if (currentSlots.pendingParticipantLookup) {
      return handleParticipantEmailRetry({ telegramId, text, session });
    }

    const missing = await getMissingSlots(currentSlots);

    logger.info('[MessageHandler] Active session slot check', {
      telegramId: tidStr,
      slots: currentSlots,
      missing,
    });

    if (missing.length > 0) {
      // BUG FIX 1 (part 2): Before asking for a phone number, pre-resolve
      // participant userIds and store them in slots.phoneTargets so the phone
      // answer handler can reliably update the correct DB record without a
      // second fuzzy name lookup that may fail.
      const firstPhone = missing.find(s => s.startsWith('phone_'));
      if (firstPhone && !currentSlots.phoneTargets) {
        const participants = Array.isArray(currentSlots.participants)
          ? currentSlots.participants
          : [currentSlots.participants].filter(Boolean);

        const phoneTargets = {};
        for (const ref of participants) {
          const trimmed = (ref || '').trim();
          if (!trimmed) continue;
          const isEmail = trimmed.includes('@');
          const firstName = trimmed.split(' ')[0];
          const u = await prisma.user.findFirst({
            where: isEmail
              ? { email: { equals: trimmed, mode: 'insensitive' } }
              : {
                  OR: [
                    { name: { equals: trimmed, mode: 'insensitive' } },
                    { name: { contains: trimmed, mode: 'insensitive' } },
                    { name: { contains: firstName, mode: 'insensitive' } },
                  ],
                },
            select: { id: true, name: true },
          });
          if (u) {
            phoneTargets[trimmed] = u.id;
            logger.info('[MessageHandler] phoneTargets: resolved participant', { ref: trimmed, userId: u.id, name: u.name });
          } else {
            logger.warn('[MessageHandler] phoneTargets: could not resolve participant', { ref: trimmed });
          }
        }

        // Persist phoneTargets into session so it's available when the answer comes in
        const withTargets = { ...currentSlots, phoneTargets };
        await saveSession({
          telegramId,
          intent:    session.intent,
          slots:     withTargets,
          status:    'active',
          sessionId: session.id,
        });
        // Update local reference so handleSlotAnswer sees the updated session
        session = { ...session, slots: withTargets };
      }

      return handleSlotAnswer({ telegramId, text, session, missing });
    }

    // All slots already filled — re-show confirmation
    return buildConfirmationMessage({ telegramId, session });
  }

  // ── 4. No active session → run intent extraction ────────────────────────────
  const { intent, slots: rawSlots, confidence } = await extractIntent({
    message: text,
    context: {},
    telegramId,
  });

  // Normalize participants immediately — Groq sometimes returns a plain string
  // like "Rahul" instead of ["Rahul"]. getMissingSlots and resolveParticipants
  // both require an array.
  const slots = {
    ...rawSlots,
    participants: normalizeParticipants(rawSlots?.participants),
  };

  const missingAfterExtract = await getMissingSlots(slots);

  logger.info('[MessageHandler] New intent — slot check', {
    telegramId: tidStr,
    intent,
    confidence,
    slots,
    missing: missingAfterExtract,
  });

  // Handle non-scheduling intents
  if (intent === 'QUERY_SCHEDULE') {
    return handleQuerySchedule(telegramId);
  }

  if (intent === 'UNKNOWN' || confidence < 0.4) {
    return (
      `🤔 I'm not sure what you mean. I can help you:\n` +
      `• Schedule meetings — try "Schedule a call with Priya on Friday at 3pm"\n` +
      `• View your schedule — try "What meetings do I have today?"\n` +
      `• Use /help for all options`
    );
  }

  if (intent !== 'CREATE_MEETING' && intent !== 'RESCHEDULE') {
    return (
      `I understood you want to ${intent.replace(/_/g, ' ').toLowerCase()}.\n\n` +
      `That feature is coming soon! For now I can help you schedule meetings. ` +
      `Try: "Schedule a call with Rahul tomorrow at 3pm"`
    );
  }

  // CREATE_MEETING or RESCHEDULE — start a session with normalized slots
  const newSession = await saveSession({
    telegramId,
    intent,
    slots,
    status: 'active',
  });

  if (missingAfterExtract.length === 0) {
    // All slots extracted in one shot — jump straight to confirmation
    return buildConfirmationMessage({ telegramId, session: newSession });
  }

  // Ask for the first missing required slot
  const firstMissing = missingAfterExtract[0];
  return (
    `Got it — let me help you schedule that. 📋\n\n` +
    getSlotQuestion(firstMissing)
  );
}


// ─── Slot answer handler ──────────────────────────────────────────────────────

/**
 * The user's message is an answer to a slot question.
 * Re-run intent extraction with the full conversation context so Groq
 * can parse the new value in context, then merge into existing slots.
 */
async function handleSlotAnswer({ telegramId, text, session, missing }) {
  const currentSlots = session.slots || {};
  const nextSlotKey  = missing[0];

  // ── Phone slot handler ────────────────────────────────────────────────────────────
  if (nextSlotKey.startsWith('phone_')) {
    const participantName = nextSlotKey.slice(6);
    const rawPhone = text.trim().replace(/\s+/g, ''); // strip all spaces
    const PHONE_RE = /^\+[1-9]\d{9,14}$/;

    if (!PHONE_RE.test(rawPhone)) {
      return (
        `❌ That doesn't look right. Please use international format like +91xxxxxxxxxx\n` +
        `(starts with +, 10–15 digits total)\n\n` +
        getSlotQuestion(nextSlotKey)
      );
    }

    // BUG FIX 1: Use phoneTargets map (built when phone slot was first detected)
    // to reliably find the userId — avoids a second fuzzy name lookup that can
    // fail if the name doesn't exactly match what's stored in the DB.
    const phoneTargets = currentSlots.phoneTargets || {};
    const targetUserId = phoneTargets[participantName];

    logger.info('[MessageHandler] Phone slot answer received', {
      participantName,
      rawPhone,
      targetUserId: targetUserId || '(not in phoneTargets — will fallback to name lookup)',
    });

    if (targetUserId) {
      // Fast path: we already know the userId from when we asked the question
      await prisma.user.update({
        where: { id: targetUserId },
        data:  { phoneNumber: rawPhone },
      });
      logger.info('[MessageHandler] Phone saved via phoneTargets map', { participantName, userId: targetUserId, phone: rawPhone });
    } else {
      // Fallback: fuzzy name lookup (same logic as resolveParticipants)
      const isEmail = participantName.includes('@');
      const firstName = participantName.split(' ')[0];
      const dbUser = await prisma.user.findFirst({
        where: isEmail
          ? { email: { equals: participantName, mode: 'insensitive' } }
          : {
              OR: [
                { name: { equals: participantName, mode: 'insensitive' } },
                { name: { contains: participantName, mode: 'insensitive' } },
                { name: { contains: firstName, mode: 'insensitive' } },
              ],
            },
        select: { id: true },
      });
      if (dbUser) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data:  { phoneNumber: rawPhone },
        });
        logger.info('[MessageHandler] Phone saved via fallback name lookup', { participantName, userId: dbUser.id, phone: rawPhone });
      } else {
        logger.warn('[MessageHandler] Could not find user to save phone', { participantName });
      }
    }

    // Store the phone in session slots AND clear from phoneTargets
    const updatedPhoneTargets = { ...phoneTargets };
    delete updatedPhoneTargets[participantName];

    const updatedSlots = {
      ...currentSlots,
      [nextSlotKey]: rawPhone,           // marks slot as filled for getMissingSlots
      phoneTargets: updatedPhoneTargets, // remove resolved entry
    };

    const updatedSession = await saveSession({
      telegramId,
      intent:    session.intent,
      slots:     updatedSlots,
      status:    'active',
      sessionId: session.id,
    });

    logger.info('[MessageHandler] Phone slot cleared, checking remaining slots', { nextSlotKey });

    const stillMissing = await getMissingSlots(updatedSlots);
    if (stillMissing.length === 0) {
      return `📲 Perfect! I've saved ${participantName}'s number ✓\n\n` +
        await buildConfirmationMessage({ telegramId, session: updatedSession });
    }
    return `📲 Perfect! I've saved ${participantName}'s number ✓\n\n` +
      getSlotQuestion(stillMissing[0]);
  }

  // ── Normal slot handler ────────────────────────────────────────────────────────────
  // Run a focused extraction to parse this answer in context
  const { slots: freshRaw } = await extractIntent({
    message: text,
    context: { intent: session.intent, slots: currentSlots, waitingFor: nextSlotKey },
    telegramId,
  });

  // Normalize participants in the fresh answer too
  const freshSlots = {
    ...freshRaw,
    participants: normalizeParticipants(freshRaw.participants ?? currentSlots.participants),
  };

  // Merge: new slots override, keep all previous values
  const mergedSlots = { ...currentSlots, ...freshSlots };

  logger.info('[MessageHandler] Slot answer merged', {
    telegramId: String(telegramId),
    nextSlotKey,
    freshSlots,
    mergedSlots,
    stillMissing: await getMissingSlots(mergedSlots),
  });

  const updatedSession = await saveSession({
    telegramId,
    intent:    session.intent,
    slots:     mergedSlots,
    status:    'active',
    sessionId: session.id,
  });

  const stillMissing = await getMissingSlots(mergedSlots);

  if (stillMissing.length === 0) {
    return buildConfirmationMessage({ telegramId, session: updatedSession });
  }

  const nextMissing = stillMissing[0];
  return getSlotQuestion(nextMissing);
}

// ─── Participant email retry handler ──────────────────────────────────────────

/**
 * Fires when the session has a pendingParticipantLookup slot set.
 * The user's current message is treated as the email to retry the lookup.
 *
 * - Looks up the email in the DB.
 * - If found: replaces the unresolved name in participants[], clears the
 *   pending flag, and continues (either asks for more slots or shows confirm).
 * - If not found: re-prompts the user with a clear message.
 */
async function handleParticipantEmailRetry({ telegramId, text, session }) {
  const slots          = session.slots || {};
  const unresolvedName = slots.pendingParticipantLookup;
  const input          = text.trim();

  logger.info('[MessageHandler] Participant email retry', { telegramId: String(telegramId), unresolvedName, input });

  // BUG FIX 3a: Handle /cancel during email retry
  if (input === '/cancel' || input.toLowerCase() === 'cancel') {
    await clearSession(telegramId);
    logger.info('[MessageHandler] Session cancelled during email retry', { telegramId: String(telegramId) });
    return `❌ Cancelled. Start fresh anytime — just send a new scheduling request.`;
  }

  // BUG FIX 3b: Validate email format before even hitting the DB
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(input)) {
    logger.info('[MessageHandler] Email retry rejected — invalid format', { telegramId: String(telegramId), input });
    return (
      `❌ That doesn't look like a valid email address.\n` +
      `Please provide ${unresolvedName}'s email in the format: name@example.com\n\n` +
      `Or type /cancel to start over.`
    );
  }

  const email = input;

  // Attempt lookup by the provided email
  const user = await prisma.user.findFirst({
    where:  { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    // Still not found — re-prompt, keeping the pending flag intact
    return (
      `❌ I still couldn't find anyone with email "${email}".\n` +
      `Please double-check the address or type /cancel to abort.`
    );
  }

  // Found — replace the unresolved name with the actual email in the participants list
  const currentParticipants = Array.isArray(slots.participants) ? slots.participants : [];
  const updatedParticipants = currentParticipants.map((p) =>
    p.trim().toLowerCase() === unresolvedName.toLowerCase() ? user.email : p,
  );

  // Clear the pending flag and update participants
  const updatedSlots = {
    ...slots,
    participants:             updatedParticipants,
    pendingParticipantLookup: undefined,   // clear flag
  };
  // Prisma JSON fields don't strip undefined — explicitly delete it
  delete updatedSlots.pendingParticipantLookup;

  const updatedSession = await saveSession({
    telegramId,
    intent:    session.intent,
    slots:     updatedSlots,
    status:    'active',
    sessionId: session.id,
  });

  logger.info('[MessageHandler] Participant resolved via email retry', {
    telegramId: String(telegramId),
    resolvedUser: user.email,
  });

  // Continue the normal flow
  const stillMissing = await getMissingSlots(updatedSlots);
  if (stillMissing.length === 0) {
    return buildConfirmationMessage({ telegramId, session: updatedSession });
  }

  const nextMissing = stillMissing[0];
  return getSlotQuestion(nextMissing);
}

// ─── Confirmation state handler ───────────────────────────────────────────────

async function handleConfirmationReply({ telegramId, text, session }) {
  const normalized = text.trim().toLowerCase();

  if (normalized === 'yes' || normalized === 'y' || normalized === 'confirm') {
    return createMeetingFromSession({ telegramId, session });
  }

  if (normalized === 'cancel' || normalized === 'no' || normalized === 'n') {
    await clearSession(telegramId);
    return `❌ Cancelled. Let me know whenever you need to schedule something!`;
  }

  if (normalized === 'change' || normalized.startsWith('change')) {
    // Keep session active, let user tell us what to change
    await saveSession({
      telegramId,
      intent:    session.intent,
      slots:     session.slots,
      status:    'active',
      sessionId: session.id,
    });
    return `✏️ What would you like to change? (date / time / participants / title)`;
  }

  // Unrecognised — re-prompt
  return `Please reply yes to confirm, change to edit details, or cancel to abort.`;
}

// ─── Build confirmation message ───────────────────────────────────────────────

async function buildConfirmationMessage({ telegramId, session }) {
  const slots = session.slots || {};

  const title       = slots.title        || 'Untitled Meeting';
  const date        = slots.date         || '(date not set)';
  const time        = slots.time         || '(time not set)';
  const duration    = slots.durationMins ? `${slots.durationMins} min` : '60 min';
  const location    = slots.location     || null;

  // Build participant list with phone numbers from slots or DB
  const participantRefs = Array.isArray(slots.participants)
    ? slots.participants
    : [slots.participants].filter(Boolean);

  const participantLines = [];
  for (const ref of participantRefs) {
    const trimmed = (ref || '').trim();
    if (!trimmed) continue;

    // Check slot-collected phone first, then DB
    const slotPhone = slots[`phone_${trimmed}`];
    let phone = slotPhone || null;

    if (!phone) {
      const isEmail = trimmed.includes('@');
      const dbUser = await prisma.user.findFirst({
        where: isEmail
          ? { email: { equals: trimmed, mode: 'insensitive' } }
          : { name:  { contains: trimmed, mode: 'insensitive' } },
        select: { phoneNumber: true },
      });
      phone = dbUser?.phoneNumber || null;
    }

    if (phone) {
      participantLines.push(`👥 ${trimmed} (${phone}) ✅`);
    } else {
      participantLines.push(`⚠️ ${trimmed} — no phone number (won't receive voice call)`);
    }
  }

  const participantsText = participantLines.join('\n') || '(none)';

  // Flip session to 'confirming' so next message is handled as a confirmation reply
  await saveSession({
    telegramId,
    intent:    session.intent,
    slots:     session.slots,
    status:    'confirming',
    sessionId: session.id,
  });

  return (
    `✅ Here's what I'll schedule:\n\n` +
    `📝 Title: ${title}\n` +
    `📅 Date: ${date} at ${time} (${duration})\n` +
    participantsText + '\n' +
    (location ? `📍 Location: ${location}\n` : '') +
    `\nShall I proceed? Reply yes, change, or cancel`
  );
}

// ─── Create meeting from confirmed session ────────────────────────────────────

async function createMeetingFromSession({ telegramId, session }) {
  const slots = session.slots || {};

  try {
    // 1. Parse start/end times
    const dateStr  = slots.date || '';
    const timeStr  = slots.time || '09:00';
    const duration = parseInt(slots.durationMins) || 60;

    const startTime = parseDatetime(dateStr, timeStr);
    const endTime   = new Date(startTime.getTime() + duration * 60 * 1000);

    if (isNaN(startTime.getTime())) {
      await clearSession(telegramId);
      return `⚠️ I couldn't parse the date "${dateStr}". Please start over with a clearer date.`;
    }

    // 2. Resolve participants — look up Users by email or name
    const participantRefs = Array.isArray(slots.participants)
      ? slots.participants
      : [slots.participants].filter(Boolean);

    const { resolved: participantUsers, unresolved } = await resolveParticipants(participantRefs);

    // If any names/emails couldn't be matched, pause and ask for email
    if (unresolved.length > 0) {
      const unresolvedName = unresolved[0];
      // Persist the unresolved name so the next message is treated as a retry
      await saveSession({
        telegramId,
        intent:    session.intent,
        slots:     { ...session.slots, pendingParticipantLookup: unresolvedName },
        status:    'active',
        sessionId: session.id,
      });
      return (
        `🔍 I couldn't find anyone named "${unresolvedName}" in the system.\n` +
        `Could you give me their email address instead?`
      );
    }

    if (participantUsers.length === 0) {
      return `⚠️ I couldn't find any participants in the system. Please use registered email addresses.`;
    }

    // 3. Find the organizer: the linked Exora AI user for this telegramId
    const organizer = await prisma.user.findFirst({
      where: { telegramId: String(telegramId), telegramLinked: true },
    });
    if (!organizer) {
      logger.error('[MessageHandler] No linked user found for telegramId', { telegramId });
      await clearSession(telegramId);
      return `🔗 Your Telegram account isn’t linked yet. Visit your dashboard to connect it.`;
    }

    // 4. Create the meeting + participants atomically
    const title = slots.title || `Meeting scheduled via Telegram`;
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description:  slots.notes || null,
        startTime,
        endTime,
        organizerId:  organizer.id,
        agendaTopics: [],
        participants: {
          create: participantUsers.map((u) => ({ userId: u.id, status: 'PENDING' })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    logger.info('[MessageHandler] Meeting created via bot', { meetingId: meeting.id, telegramId });

    // 5. Log AIEvent
    await logEvent({
      type:      'SYSTEM',
      message:   `Meeting "${title}" created via Telegram bot`,
      status:    'success',
      meetingId: meeting.id,
      metadata:  { telegramId, participantCount: participantUsers.length },
    });

    // 6. Send email invites (fire-and-forget)
    const recipients = meeting.participants.map((p) => ({
      email:  p.user.email,
      userId: p.user.id,
    }));

    sendBulkEmail({
      recipients,
      subject: `Meeting Invitation: ${title}`,
      body:    `You've been invited to "${title}" on ${startTime.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.\n\nPlease log in to Exora AI to confirm your attendance.`,
      meetingId: meeting.id,
    }).catch((e) => logger.error('[MessageHandler] Email send failed', { error: e.message }));

    // 7. Update BotSession with meetingId and mark completed
    await saveSession({
      telegramId,
      intent:    session.intent,
      slots:     session.slots,
      status:    'completed',
      sessionId: session.id,
      meetingId: meeting.id,
    });

    const participantNames = meeting.participants.map((p) => p.user.name || p.user.email).join(', ');
    const fmtDate = startTime.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    return (
      `🎉 Meeting scheduled!

` +
      `📝 ${title}
` +
      `📅 ${fmtDate}
` +
      `👥 ${participantNames}

` +
      `✉️ Email invites sent. They'll receive their invitations shortly.`
    );
  } catch (err) {
    logger.error('[MessageHandler] createMeetingFromSession failed', { telegramId, error: err.message, stack: err.stack });
    await clearSession(telegramId);
    return `⚠️ Something went wrong creating the meeting: ${err.message}. Session cleared — please try again.`;
  }
}

// ─── QUERY_SCHEDULE handler ────────────────────────────────────────────────────

async function handleQuerySchedule(telegramId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const meetings = await prisma.meeting.findMany({
    where: { startTime: { gte: startOfDay, lte: endOfDay } },
    orderBy: { startTime: 'asc' },
    select: { title: true, startTime: true, endTime: true, status: true },
  });

  if (meetings.length === 0) {
    return `📅 You have no meetings scheduled for today. Want to schedule one?`;
  }

  const lines = meetings.map((m) => {
    const start = m.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `• ${m.title} at ${start} (${m.status})`;
  });

  return `📅 Today's meetings:

${lines.join('\n')}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a natural-ish date string + HH:MM time into a Date object.
 * Handles: "tomorrow", "Friday", ISO date strings, "YYYY-MM-DD".
 */
function parseDatetime(dateStr, timeStr) {
  const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);

  const lower = (dateStr || '').toLowerCase().trim();
  let base = new Date();

  if (lower === 'tomorrow') {
    base.setDate(base.getDate() + 1);
  } else if (['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(lower)) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const target = days.indexOf(lower);
    const current = base.getDay();
    const diff = (target - current + 7) % 7 || 7;
    base.setDate(base.getDate() + diff);
  } else {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) base = parsed;
  }

  base.setHours(hours || 9, minutes || 0, 0, 0);
  return base;
}

/**
 * Given an array of email addresses or names, look up matching User records.
 *
 * Returns { resolved: User[], unresolved: string[] } so callers can tell
 * which refs had no match and ask the user for more info.
 *
 * Matching rules:
 *   - Contains '@' → exact email match (case-insensitive)
 *   - Otherwise    → case-insensitive name contains match
 *
 * @param {string[]} refs
 * @returns {Promise<{ resolved: User[], unresolved: string[] }>}
 */
async function resolveParticipants(refs) {
  if (!refs || refs.length === 0) return { resolved: [], unresolved: [] };

  const resolved   = [];
  const unresolved = [];

  // Resolve each ref individually so we can tell which ones failed
  for (const ref of refs) {
    const trimmed = ref.trim();
    if (!trimmed) continue;

    const isEmail = trimmed.includes('@');
    // BUG FIX 2: First-name fallback + verbose logging for easier debugging
    const firstName = trimmed.split(' ')[0];

    logger.info('[resolveParticipants] Trying lookup', { ref: trimmed, firstName, isEmail });

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: trimmed, mode: 'insensitive' } }
        : {
            OR: [
              { name: { equals:   trimmed,    mode: 'insensitive' } },
              { name: { contains: trimmed,    mode: 'insensitive' } },
              { name: { contains: firstName,  mode: 'insensitive' } },
            ],
          },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      logger.info('[resolveParticipants] Resolved', { ref: trimmed, userId: user.id, name: user.name });
      resolved.push(user);
    } else {
      logger.warn('[resolveParticipants] Could not resolve', { ref: trimmed, firstName });
      unresolved.push(trimmed);
    }
  }

  logger.info('[resolveParticipants] Lookup complete', {
    refs,
    resolvedCount:   resolved.length,
    unresolvedNames: unresolved,
  });

  return { resolved, unresolved };
}

/**
 * Coerce Groq's participants output to a clean string array.
 *
 * Groq may return:
 *   - null / undefined          → []
 *   - "Rahul"                   → ["Rahul"]
 *   - "Rahul, Priya"            → ["Rahul", "Priya"]
 *   - ["Rahul", "Priya"]        → ["Rahul", "Priya"]  (pass-through)
 *
 * @param {any} value
 * @returns {string[]}
 */
function normalizeParticipants(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}


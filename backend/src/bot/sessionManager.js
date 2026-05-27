import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Phase R2: Session Manager
 *
 * Manages the BotSession lifecycle in PostgreSQL.
 * Each Telegram user has at most one 'active' session at a time.
 *
 * Required slots for a CREATE_MEETING to proceed:
 *   - date         (ISO date string)
 *   - time         (HH:MM 24h)
 *   - participants (array of at least one email or name)
 *
 * Optional (nice to have but not blocking):
 *   - title, durationMins, location, notes
 */

export const REQUIRED_SLOTS = ['date', 'time', 'participants'];

const PHONE_RE = /^\+[1-9]\d{9,14}$/;

// ─── loadSession ──────────────────────────────────────────────────────────────

/**
 * Find the active BotSession for a given Telegram user.
 * Returns null if no active session exists.
 *
 * @param {string|number} telegramId
 * @returns {Promise<object|null>}
 */
export async function loadSession(telegramId) {
  try {
    const session = await prisma.botSession.findFirst({
      where: {
        telegramId: String(telegramId),
        // Must include 'confirming' — otherwise the yes/change/cancel handler
        // never fires because loadSession returns null for confirming sessions.
        status: { in: ['active', 'confirming'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return session || null;
  } catch (err) {
    logger.error('[SessionManager] loadSession failed', { telegramId, error: err.message });
    return null;
  }
}

// ─── saveSession ──────────────────────────────────────────────────────────────

/**
 * Create a new BotSession or update the existing active one.
 * Slots are always merged — never replaced wholesale — so partial updates work.
 *
 * @param {object} opts
 * @param {string|number} opts.telegramId
 * @param {string}  opts.intent
 * @param {object}  opts.slots          - Partial or complete slot map
 * @param {string}  [opts.status]       - 'active' | 'confirming' | 'completed' (default: 'active')
 * @param {string}  [opts.meetingId]    - Set once the meeting is created in DB
 * @param {string}  [opts.sessionId]    - Existing session ID to update (if known)
 * @returns {Promise<object>}           - The created/updated BotSession
 */
export async function saveSession({ telegramId, intent, slots, status = 'active', meetingId, sessionId }) {
  try {
    if (sessionId) {
      // Update existing session — merge slots
      const existing = await prisma.botSession.findUnique({ where: { id: sessionId } });
      const mergedSlots = { ...(existing?.slots || {}), ...slots };

      return await prisma.botSession.update({
        where: { id: sessionId },
        data: {
          intent,
          slots: mergedSlots,
          status,
          meetingId: meetingId || existing?.meetingId || null,
        },
      });
    }

    // Create new session — resolve userId from linked Telegram account
    let resolvedUserId = null;
    try {
      const linkedUser = await prisma.user.findFirst({
        where: { telegramId: String(telegramId), telegramLinked: true },
        select: { id: true },
      });
      resolvedUserId = linkedUser?.id || null;
    } catch (lookupErr) {
      logger.warn('[SessionManager] userId lookup failed, creating session without userId', {
        telegramId,
        error: lookupErr.message,
      });
    }

    return await prisma.botSession.create({
      data: {
        telegramId: String(telegramId),
        intent,
        slots: slots || {},
        status,
        meetingId: meetingId || null,
        userId: resolvedUserId,
      },
    });
  } catch (err) {
    logger.error('[SessionManager] saveSession failed', { telegramId, sessionId, error: err.message });
    throw err;
  }
}

// ─── clearSession ─────────────────────────────────────────────────────────────

/**
 * Mark the active session for a user as 'completed'.
 * Does not delete — keeps the record for audit purposes.
 *
 * @param {string|number} telegramId
 * @returns {Promise<void>}
 */
export async function clearSession(telegramId) {
  try {
    await prisma.botSession.updateMany({
      where: {
        telegramId: String(telegramId),
        status:     { in: ['active', 'confirming'] },
      },
      data: { status: 'completed' },
    });
    logger.info('[SessionManager] Session cleared', { telegramId });
  } catch (err) {
    logger.error('[SessionManager] clearSession failed', { telegramId, error: err.message });
  }
}

// ─── getMissingSlots ──────────────────────────────────────────────────────────

/**
 * Given a slots object, return which required slots are still missing.
 *
 * Now ASYNC — after confirming date/time/participants are filled it also checks
 * whether each resolved participant has a phoneNumber in the DB. If not, it
 * adds a synthetic 'phone_[participantName]' slot so the bot can collect it.
 *
 * @param {object} slots
 * @returns {Promise<string[]>} Array of missing required slot names
 */
export async function getMissingSlots(slots = {}) {
  // Check static required slots first
  const staticMissing = REQUIRED_SLOTS.filter((key) => {
    const val = slots[key];
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  });

  if (staticMissing.length > 0) return staticMissing;

  // All static slots filled — check phone numbers for each participant
  const participantRefs = Array.isArray(slots.participants)
    ? slots.participants
    : [slots.participants].filter(Boolean);

  const phoneSlots = [];

  for (const ref of participantRefs) {
    const trimmed = (ref || '').trim();
    if (!trimmed) continue;

    // Skip if we already collected the phone for this participant in this session
    const slotKey = `phone_${trimmed}`;
    const existingPhone = slots[slotKey];
    if (existingPhone && PHONE_RE.test(existingPhone)) continue;

    // Query DB to see if participant already has a phone number
    const isEmail = trimmed.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: trimmed, mode: 'insensitive' } }
        : { name:  { contains: trimmed, mode: 'insensitive' } },
      select: { phoneNumber: true },
    });

    // No DB record yet OR phone missing → collect it
    if (!user || !user.phoneNumber || user.phoneNumber.trim() === '') {
      phoneSlots.push(slotKey);
    }
  }

  return phoneSlots;
}

// ─── Slot question prompts ────────────────────────────────────────────────────

/**
 * Maps a missing slot name → a friendly question to ask the user.
 * For dynamic phone slots ('phone_[name]'), use getSlotQuestion() instead.
 */
export const SLOT_QUESTIONS = {
  date:         '📅 What date? (e.g. "tomorrow", "Friday", "May 15")',
  time:         '🕐 What time? (e.g. "3pm", "15:00")',
  participants: '👥 Who should attend? (share emails or names, comma-separated)',
  title:        '📝 What should I call this meeting?',
  durationMins: '⏱️ How long? (e.g. "30 minutes", "1 hour")',
  location:     '📍 Where? (location or video link — or skip)',
};

/**
 * Returns the question text for any slot key, including dynamic phone slots.
 * @param {string} slotKey
 * @returns {string}
 */
export function getSlotQuestion(slotKey) {
  if (slotKey.startsWith('phone_')) {
    const name = slotKey.slice(6); // strip 'phone_'
    return (
      `📞 What's ${name}'s phone number?\n` +
      `I'll need it to call them before the meeting.\n` +
      `(e.g. +91xxxxxxxxxx or +1xxxxxxxxxx)`
    );
  }
  return SLOT_QUESTIONS[slotKey] || `What is the ${slotKey}?`;
}

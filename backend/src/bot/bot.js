import { Bot, webhookCallback } from 'grammy';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { handleMessage } from './messageHandler.js';

const prisma = new PrismaClient();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  logger.error('[Bot] TELEGRAM_BOT_TOKEN is not set — bot will not start');
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

/**
 * Phase R2: Grammy Bot instance — webhook mode.
 *
 * IMPORTANT: All replies use parse_mode: 'HTML'.
 * Telegram's legacy Markdown mode silently rejects messages containing
 * unmatched *, _, or ` characters — causing Grammy to throw a 400 that
 * was previously swallowed. HTML mode is forgiving and never breaks on
 * content characters.
 */
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// ─── Grammy-level error handler ───────────────────────────────────────────────
// Without this, any error thrown inside a handler (including Telegram API
// rejections) is silently dropped and the user gets no response.

bot.catch((err) => {
  const ctx = err.ctx;
  const telegramId = ctx?.from?.id;
  logger.error('[Bot] Unhandled Grammy error', {
    telegramId,
    error:   err.error?.message || String(err),
    update:  JSON.stringify(ctx?.update || {}).slice(0, 300),
  });

  // Attempt a plain-text fallback reply — no parse_mode so it can't fail on formatting
  ctx?.reply('⚠️ An error occurred. Please try again or type /start to reset.')
    .catch((replyErr) => {
      logger.error('[Bot] Failed to send error fallback reply', { error: replyErr.message });
    });
});

// ─── Command: /start ─────────────────────────────────────────────────────────
// Handles both plain /start (welcome) and /start TOKEN (account linking).

bot.command('start', async (ctx) => {
  const telegramId = String(ctx.from?.id);
  const firstName  = ctx.from?.first_name || 'there';

  logger.info('[Bot] /start', { telegramId });

  // Check if a linking token was passed: /start <64-char-hex>
  const payload = ctx.match?.trim();

  if (payload && payload.length === 64) {
    // ── Linking flow ──────────────────────────────────────────────────────────
    try {
      // 1. Find user with this non-expired token
      const user = await prisma.user.findFirst({
        where: {
          telegramLinkToken: payload,
          telegramLinkExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        await ctx.reply(
          '⏰ This link has expired or is invalid.\n\n' +
          'Please go back to your dashboard and generate a new connection link.',
        );
        return;
      }

      // 2. Check if this Telegram ID is already linked to a DIFFERENT account
      const existing = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (existing && existing.id !== user.id) {
        await ctx.reply(
          '⚠️ This Telegram account is already linked to a different Exora AI account.\n\n' +
          'Please contact support if this is an error.',
        );
        return;
      }

      // 3. Link the accounts — clear single-use token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId,
          telegramLinked:      true,
          telegramLinkToken:   null,  // single-use — clear immediately
          telegramLinkExpiry:  null,
        },
      });

      logger.info('[Bot] Telegram account linked', {
        userId:     user.id,
        telegramId,
        email:      user.email,
      });

      await ctx.reply(
        `✅ <b>Connected!</b> Your Telegram is now linked to your Exora AI account (${user.email}).\n\n` +
        `You're ready to schedule meetings! Try:\n` +
        `<i>"Schedule a call with [name] tomorrow at 3pm"</i>`,
        { parse_mode: 'HTML' },
      );
      return;

    } catch (error) {
      logger.error('[Bot] Telegram linking failed', {
        error: error.message,
        telegramId,
      });
      await ctx.reply('Something went wrong. Please try again.');
      return;
    }
  }

  // ── No token — check if already linked ───────────────────────────────────
  try {
    const linkedUser = await prisma.user.findFirst({
      where: { telegramId },
      select: { name: true, email: true },
    });

    if (linkedUser) {
      await ctx.reply(
        `👋 Welcome back, <b>${linkedUser.name || linkedUser.email}</b>!\n\n` +
        `Your account is connected. Try:\n` +
        `<i>"Schedule a call with [name] tomorrow at 3pm"</i>\n\n` +
        `<b>Commands:</b>\n` +
        `/today — See today's meetings\n` +
        `/clear — Reset conversation\n` +
        `/help  — What I can do`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply(
        `👋 Hi <b>${firstName}</b>! I'm <b>Exora AI</b>, your meeting assistant.\n\n` +
        `To get started, connect your Telegram to your Exora AI account:\n\n` +
        `1️⃣ Go to your Exora AI dashboard\n` +
        `2️⃣ Click <b>"Connect Telegram"</b> in the sidebar\n` +
        `3️⃣ Click the link — it brings you back here ✅\n\n` +
        `Don't have an account yet? Sign up at your dashboard URL.`,
        { parse_mode: 'HTML' },
      );
    }
  } catch (err) {
    logger.error('[Bot] /start lookup failed', { telegramId, error: err.message });
    await ctx.reply('⚠️ Something went wrong. Please try /start again.');
  }
});



// ─── Command: /help ───────────────────────────────────────────────────────────

bot.command('help', async (ctx) => {
  const telegramId = ctx.from?.id;
  logger.info('[Bot] /help', { telegramId });

  await ctx.reply(
    `🤖 <b>Exora Meeting Assistant — Commands</b>\n\n` +
    `/start — Welcome message\n` +
    `/help  — Show this menu\n` +
    `/today — View today's meetings\n` +
    `/clear — Clear a stuck conversation and start fresh\n\n` +
    `<b>Natural language examples:</b>\n` +
    `• "Schedule a call with Priya on Friday at 2pm"\n` +
    `• "Reschedule my 3pm to 5pm"\n` +
    `• "Cancel tomorrow's standup"\n` +
    `• "What meetings do I have today?"\n\n` +
    `<i>I'll ask for anything I'm missing.</i>`,
    { parse_mode: 'HTML' }
  );
});

// ─── Command: /today ─────────────────────────────────────────────────────────

bot.command('today', async (ctx) => {
  const telegramId = ctx.from?.id;
  logger.info('[Bot] /today', { telegramId });

  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const meetings = await prisma.meeting.findMany({
      where: { startTime: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startTime: 'asc' },
      select: {
        id:        true,
        title:     true,
        startTime: true,
        endTime:   true,
        status:    true,
        participants: {
          select: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (meetings.length === 0) {
      return ctx.reply('📅 No meetings scheduled for today. Want to schedule one?');
    }

    const dateLabel = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const lines = meetings.map((m, i) => {
      const start = m.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const end   = m.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const names = m.participants.map((p) => p.user.name || p.user.email).join(', ') || 'No participants';
      return `${i + 1}. <b>${m.title}</b>\n   🕐 ${start} – ${end}\n   👥 ${names}\n   📌 ${m.status}`;
    });

    await ctx.reply(
      `📅 <b>Today's Meetings (${dateLabel})</b>\n\n${lines.join('\n\n')}`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    logger.error('[Bot] /today failed', { telegramId, error: err.message });
    await ctx.reply('⚠️ Could not fetch meetings. Please try again.');
  }
});

// ─── Command: /clear ─────────────────────────────────────────────────────────

bot.command('clear', async (ctx) => {
  const telegramId = String(ctx.from?.id);
  try {
    const result = await prisma.botSession.updateMany({
      where: {
        telegramId,
        status: { in: ['active', 'confirming'] },
      },
      data: { status: 'abandoned' },
    });
    logger.info('[Bot] /clear', { telegramId, sessionsCleared: result.count });
    await ctx.reply(
      `🧹 Cleared! All active sessions reset.\n` +
      `Start fresh — tell me what you'd like to schedule.`,
    );
  } catch (err) {
    logger.error('[Bot] /clear failed', { telegramId, error: err.message });
    await ctx.reply('Something went wrong. Try again.');
  }
});

// ─── All other messages → messageHandler ─────────────────────────────────────
// Note: Grammy processes commands before message:text, so /start /help /today
// are already handled above. This handler only fires for free-text messages.

bot.on('message:text', async (ctx) => {
  const telegramId = ctx.from?.id;
  const text       = ctx.message.text;

  // Skip commands — they are already handled above
  if (text.startsWith('/')) return;

  logger.info('[Bot] Incoming text message', { telegramId, text: text.slice(0, 100) });

  const reply = await handleMessage({ telegramId, text });

  if (reply && reply.trim()) {
    // All messageHandler replies are plain text — no parse_mode so special
    // characters in meeting titles / participant names never break formatting.
    await ctx.reply(reply);
  } else {
    logger.warn('[Bot] handleMessage returned empty reply', { telegramId, text });
    await ctx.reply("I didn't quite get that. Try: \"Schedule a meeting with Priya tomorrow at 3pm\"");
  }
});

// ─── Webhook export ───────────────────────────────────────────────────────────

export const botWebhook = webhookCallback(bot, 'express');

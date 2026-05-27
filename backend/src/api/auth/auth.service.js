import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

/**
 * Phase 3: Auth Service — all business logic for registration and login.
 * Passwords are hashed via bcrypt; JWTs carry minimal claims (userId, role).
 * No password or secret is ever returned in responses.
 */

export const registerUser = async ({ email, password, name, role }) => {
  // Check for existing user before hashing (avoids wasted compute on duplicates)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.warn(`Registration attempt for existing email: ${email}`);
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  logger.info(`User registered: ${user.id} (${user.email})`);
  return { token, user };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Timing-safe: always run bcrypt.compare even if user not found to prevent enumeration
  const dummyHash = '$2b$12$invalidhashforsecuritypurposesonly00000000000000000000';
  const passwordMatch = await bcrypt.compare(password, user ? user.password : dummyHash);

  if (!user || !passwordMatch) {
    logger.warn(`Login failed for email: ${email}`);
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  logger.info(`User logged in: ${user.id} (${user.email})`);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      telegramLinked: true,
      credits: true,
      plan: true,
      // NEVER select: telegramLinkToken, telegramLinkExpiry, password
    },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  // Never expose the full telegramId — omit it entirely from /me
  return { ...user, telegramId: null };
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  if (!newPassword || newPassword.length < 8) {
    const err = new Error('New password must be at least 8 characters long.');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logger.info(`Password changed successfully for user: ${userId}`);
  return { success: true };
};

// ─── Step 2: Generate Telegram link token ────────────────────────────────────

/**
 * Generate a one-time 64-char hex token for Telegram account linking.
 * Token expires in 15 minutes. Overwrites any existing pending token.
 */
export const getTelegramToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramLinkToken: token,
      telegramLinkExpiry: expiry,
    },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'meetingagent_Exora_bot';
  const botUrl = `https://t.me/${botUsername}?start=${token}`;

  logger.info('[Auth] Telegram link token generated', { userId });
  return { token, botUrl, expiresIn: '15 minutes' };
};

// ─── Step 9: Telegram link status ────────────────────────────────────────────

/**
 * Return link status without exposing the full telegramId.
 * Shows only the last 4 chars of the telegramId if linked.
 */
export const getTelegramStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramLinked: true, telegramId: true, updatedAt: true },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    linked: user.telegramLinked,
    // Only last 4 chars for privacy — enough to confirm which account
    telegramId: user.telegramLinked && user.telegramId
      ? `...${user.telegramId.slice(-4)}`
      : null,
    linkedAt: user.telegramLinked ? user.updatedAt : null,
  };
};

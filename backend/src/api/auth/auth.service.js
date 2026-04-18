import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Phase S2: Contacts Service
 *
 * GET /api/contacts  — Return UserContact records where ownerId = userId (with contact user data)
 * POST /api/contacts — Find or create a user by email + create a UserContact link
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Get all contacts for the authenticated user.
 * Returns user details (id, name, email, phoneNumber) for each contact.
 *
 * @param {string} ownerId - the authenticated user's ID
 * @returns {Promise<object[]>}
 */
export const getContacts = async (ownerId) => {
  const contacts = await prisma.userContact.findMany({
    where: { ownerId },
    include: {
      contact: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return contacts.map((c) => ({
    contactId: c.contactId,
    addedAt: c.createdAt,
    ...c.contact,
  }));
};

/**
 * Create a contact link for the authenticated user.
 * Finds an existing user by email (or creates a stub if not found — not implemented here).
 * Then creates a UserContact link (upsert to avoid duplicates).
 *
 * @param {string} ownerId   - the authenticated user's ID
 * @param {string} email     - email of the contact to link
 * @returns {Promise<object>}
 */
export const addContact = async (ownerId, email) => {
  if (!email || !email.includes('@')) {
    const err = new Error('A valid email address is required.');
    err.statusCode = 400;
    throw err;
  }

  // Find or look up the user by email
  const contactUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, phoneNumber: true },
  });

  if (!contactUser) {
    const err = new Error(`No user found with email "${email}". They must register first.`);
    err.statusCode = 404;
    throw err;
  }

  if (contactUser.id === ownerId) {
    const err = new Error('You cannot add yourself as a contact.');
    err.statusCode = 400;
    throw err;
  }

  // Upsert to prevent duplicate contacts
  await prisma.userContact.upsert({
    where: { ownerId_contactId: { ownerId, contactId: contactUser.id } },
    update: {},
    create: { ownerId, contactId: contactUser.id },
  });

  logger.info(`[ContactsService] User ${ownerId} added contact ${contactUser.id} (${email})`);

  return {
    contactId: contactUser.id,
    name: contactUser.name,
    email: contactUser.email,
    phoneNumber: contactUser.phoneNumber,
  };
};

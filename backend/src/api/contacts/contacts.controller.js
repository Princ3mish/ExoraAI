/**
 * Phase S2: Contacts Controller
 *
 * GET  /api/contacts — List contacts for authenticated user
 * POST /api/contacts — Add a contact by email
 */

import * as contactsService from './contacts.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * GET /api/contacts
 * Returns all UserContact records where ownerId = req.user.userId
 */
export const getContacts = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const contacts = await contactsService.getContacts(userId);
  res.status(200).json({ status: 200, message: 'Contacts retrieved.', data: contacts });
});

/**
 * POST /api/contacts
 * Body: { email }
 * Finds the user by email and creates a UserContact link.
 */
export const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { email } = req.body;
  const contact = await contactsService.addContact(userId, email);
  res.status(201).json({ status: 201, message: 'Contact added successfully.', data: contact });
});

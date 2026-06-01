/**
 * Phase S2: Contacts Routes
 *
 * GET  /api/contacts — List contacts (authenticated)
 * POST /api/contacts — Add contact by email (authenticated)
 */

import { Router } from 'express';
import * as contactsController from './contacts.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, contactsController.getContacts);
router.post('/', authenticate, contactsController.addContact);

export default router;

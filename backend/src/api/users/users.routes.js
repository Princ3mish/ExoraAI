// Phase 2: Route layer mapping for HTTP verbs to core target controllers
import { Router } from 'express';
import {
  getUsers,
  getProfile,
  updateProfile,
  updateUserById,
  deleteAccount,
} from './users.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Profile operations (authenticated users)
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteAccount);

// Update any user by id (used by frontend to save participant phone numbers)
router.patch('/:id', authenticate, updateUserById);

// Phase 2: Wire root users fetch requests
router.get('/', getUsers);

export default router;

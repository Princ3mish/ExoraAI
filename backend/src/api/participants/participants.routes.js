// Phase 2: Participant route paths handling specific entity associations
import { Router } from 'express';
import * as participantsController from './participants.controller.js';

const router = Router();

// Phase 2: Extractor endpoint for specific joined entries
router.get('/', participantsController.getParticipants);

export default router;

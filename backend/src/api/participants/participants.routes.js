import { Router } from 'express';
import * as participantsController from './participants.controller.js';

const router = Router();

router.get('/', participantsController.getParticipants);

export default router;

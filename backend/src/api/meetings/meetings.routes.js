// Phase 2: Route layer connecting HTTP protocol structure to server operations
import { Router } from 'express';
import * as meetingsController from './meetings.controller.js';

const router = Router();

// Phase 2: Bound endpoints for meeting discovery
router.get('/', meetingsController.getMeetings);

export default router;

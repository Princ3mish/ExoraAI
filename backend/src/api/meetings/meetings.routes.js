import { Router } from 'express';
import * as meetingsController from './meetings.controller.js';

const router = Router();

router.get('/', meetingsController.getMeetings);

export default router;

import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// GET /api/settings/integrations — protected, returns status of bot, voice, and AI integrations
router.get('/integrations', authenticate, settingsController.getIntegrationsStatus);

export default router;

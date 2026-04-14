// Phase 2: Route layer. Separates standard HTTP definitions from controller execution code logic mappings.
import { Router } from 'express';
import * as authController from './auth.controller.js';

const router = Router();

// Phase 2: Scaffold generic Auth routes bridging execution paths
router.post('/login', authController.login);

export default router;

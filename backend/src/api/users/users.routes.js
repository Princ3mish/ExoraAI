// Phase 2: Route layer mapping for HTTP verbs to core target controllers
import { Router } from 'express';
import * as usersController from './users.controller.js';

const router = Router();

// Phase 2: Wire root users fetch requests
router.get('/', usersController.getUsers);

export default router;

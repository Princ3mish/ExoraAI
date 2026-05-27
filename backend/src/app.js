import express from 'express';
import cors from 'cors';

import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

// Phase 3: Feature Routers
import authRoutes from './api/auth/auth.routes.js';
import meetingRoutes from './api/meetings/meetings.routes.js';
import availabilityRoutes from './api/availability/availability.routes.js';
import userRoutes from './api/users/users.routes.js';

// Phase 4: AI Integration
import aiRoutes from './api/ai/ai.routes.js';

// Phase 6: Events Log
import eventsRoutes from './api/events/events.routes.js';

// Phase R1: Bot sessions + Voice calls
import botApiRoutes from './api/bot/bot.routes.js';
import voiceRoutes from './api/voice/voice.routes.js';
import settingsRoutes from './api/settings/settings.routes.js';
import analyticsRoutes from './api/analytics/analytics.routes.js';

// Phase R2: Grammy Telegram webhook
import { botWebhook } from './bot/bot.js';


const app = express();
const prisma = new PrismaClient();

// ── Core middleware ─────────────────────────────────────────────────────────

// Phase 2: Enable CORS correctly for the frontend mapping
app.use(cors());

// Phase R2: Grammy Telegram webhook.
// express.json() is added inline so Grammy receives a pre-parsed req.body.
// Logging is handled inside bot.js where body is guaranteed to be available.
// This route must be defined before the global express.json() below.
app.post('/api/bot/telegram', express.json(), botWebhook);

// Phase 2: Native JSON payload parsing for all other routes
app.use(express.json());


// Phase 2: Request logging middleware tracking all inbound hits, status codes, and duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Request Processed: ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────

// Phase 3: Mounted Modular API Routes — auth, meetings, availability, users
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);


// Phase 4: AI Integration Routes
app.use('/api/ai', aiRoutes);

// Phase 6: Real-time Events Polling
app.use('/api/events', eventsRoutes);

// Phase R1: Bot sessions (REST) + Voice calls
app.use('/api/bot', botApiRoutes);
app.use('/api/voice', voiceRoutes);

// ── Health check ────────────────────────────────────────────────────────────

// General health check verification including database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    logger.error('Database connection failed during health check', { error: error.message });
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Phase 2: Trigger a sample error route for testing error handler logic
app.get('/test-error', (req, res, next) => {
  const error = new Error('Test validation error');
  error.statusCode = 400;
  next(error); // Sends error through pipeline safely
});

// ── Global Error Handler ────────────────────────────────────────────────────

// Phase 2: Catch-all Global Error Handler. Must be last middleware.
app.use(errorHandler);

export default app;

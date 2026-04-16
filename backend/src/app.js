import express from 'express';
import cors from 'cors';

import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

// Phase 3: Feature Routers
import authRoutes from './api/auth/auth.routes.js';
import meetingRoutes from './api/meetings/meetings.routes.js';
import availabilityRoutes from './api/availability/availability.routes.js';



const app = express();
const prisma = new PrismaClient();

// ── Core middleware ─────────────────────────────────────────────────────────

// Phase 2: Enable CORS correctly for the frontend mapping
app.use(cors());

// Phase 2: Native JSON payload parsing
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

// Phase 3: Mounted Modular API Routes — auth, meetings, availability
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/availability', availabilityRoutes);

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

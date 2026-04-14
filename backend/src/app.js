import express from 'express';
import cors from 'cors';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './api/auth/auth.routes.js';
import userRoutes from './api/users/users.routes.js';
import meetingRoutes from './api/meetings/meetings.routes.js';
import participantRoutes from './api/participants/participants.routes.js';

const app = express();

// Phase 2: Enable CORS correctly for the frontend mapping
app.use(cors());

// Phase 2: Native JSON payload parsing
app.use(express.json());

// Phase 2: Request logging middleware tracking all inbound hits
app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  next();
});

// Phase 2: Mounted Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/participants', participantRoutes);

// General health check verification
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Phase 2: Trigger a sample error route for testing error handler logic
app.get('/test-error', (req, res, next) => {
  const error = new Error('Test validation error');
  error.statusCode = 400;
  next(error); // Sends error through pipeline safely
});

// Phase 2: Catch-all Global Error Handler. Must be last middleware.
app.use(errorHandler);

export default app;

import express from 'express';
import cors from 'cors';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './api/auth/auth.routes.js';
import userRoutes from './api/users/users.routes.js';
import meetingRoutes from './api/meetings/meetings.routes.js';
import participantRoutes from './api/participants/participants.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  next();
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/participants', participantRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Trigger a sample error route for testing (Step 7 validation)
app.get('/test-error', (req, res, next) => {
  const error = new Error('Test validation error');
  error.statusCode = 400;
  next(error);
});

// Use Global Error Handler
app.use(errorHandler);

export default app;

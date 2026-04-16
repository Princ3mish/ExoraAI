import logger from '../utils/logger.js';

// Phase 2: Global error handler intercepting all uncaught layer faults
export default function errorHandler(err, req, res, next) {
  // Extract custom or system HTTP status code natively
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma specific errors
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found.';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Resource already exists (unique constraint violation).';
  }

  // Phase 2: Log strictly mapped structured metadata using Winston JSON config
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    prismaCode: err.code
  });

  // Phase 2: Secure server output. Don't bleed 500-level raw crashes to potential client attackers
  const clientMessage = statusCode >= 500 ? 'Internal Server Error' : message;

  // Render standardized generic JSON error blob response
  res.status(statusCode).json({
    status: statusCode,
    message: clientMessage,
  });
}

import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Ensure no raw errors are exposed to clients on 500
  const clientMessage = statusCode >= 500 ? 'Internal Server Error' : message;

  res.status(statusCode).json({
    status: statusCode,
    message: clientMessage,
  });
}

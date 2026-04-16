import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Phase 3: JWT Authentication Middleware
 * Extracts Bearer token, verifies signature, attaches decoded payload to req.user.
 * Rejects missing/invalid/expired tokens with 401. No sensitive data leaked in response.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Auth failed — missing or malformed Authorization header: ${req.method} ${req.url}`);
    const err = new Error('Authentication required. Provide a valid Bearer token.');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    logger.warn(`Auth failed — token verification error: ${error.message}`, { url: req.url });
    const err = new Error('Invalid or expired token.');
    err.statusCode = 401;
    return next(err);
  }
};

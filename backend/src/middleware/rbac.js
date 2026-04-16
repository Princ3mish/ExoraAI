import logger from '../utils/logger.js';

/**
 * Phase 3: Role-Based Access Control (RBAC) Middleware
 * Returns a middleware closure that blocks requests whose req.user.role
 * is not included in the allowed roles array, yielding a 403 Forbidden.
 *
 * Usage: router.post('/', authenticate, restrictTo(['ADMIN']), handler)
 */
export const restrictTo = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    logger.warn(`RBAC denied — user role "${req.user?.role}" not in [${roles.join(', ')}] for ${req.method} ${req.url}`);
    const err = new Error('You do not have permission to perform this action.');
    err.statusCode = 403;
    return next(err);
  }
  next();
};

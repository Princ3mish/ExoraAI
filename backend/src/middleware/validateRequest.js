import { ZodError } from 'zod';
import logger from '../utils/logger.js';

export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      if (schema.body) req.body = await schema.body.parseAsync(req.body);
      if (schema.query) req.query = await schema.query.parseAsync(req.query);
      if (schema.params) req.params = await schema.params.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`Validation failed for ${req.method} ${req.url}`);
        return res.status(400).json({
          status: 400,
          message: 'Validation Error',
          errors: error.errors
        });
      }
      next(error);
    }
  };
};

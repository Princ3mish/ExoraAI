import { z } from 'zod';

/**
 * Phase 3: Zod validation schemas for the Auth module.
 * registerSchema: email, password (min 8), optional name, optional role.
 * loginSchema: email + password only.
 */
export const registerSchema = {
  body: z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
    name: z.string().min(1).optional(),
    role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(1, { message: 'Password is required.' }),
  }),
};

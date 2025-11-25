import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validate request body against Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({ error: 'Invalid request body' });
      }
    }
  };
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({ error: 'Invalid query parameters' });
      }
    }
  };
}

/**
 * Validate route parameters against Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({ error: 'Invalid route parameters' });
      }
    }
  };
}

// Common validation schemas
export const schemas = {
  walletAddress: z.string().regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, 'Invalid XRPL wallet address'),
  uuid: z.string().uuid('Invalid UUID'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10).max(20),
  role: z.enum(['freelancer', 'client', 'both']),
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),
};

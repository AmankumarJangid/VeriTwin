import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { validationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = validationError(result.error.flatten());
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
      return;
    }
    req.body = result.data;
    next();
  };
}

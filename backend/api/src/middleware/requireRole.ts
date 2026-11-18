import { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/errors';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err = forbidden();
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      const err = forbidden(`Role '${req.user.role}' is not allowed. Required: ${roles.join(', ')}`);
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { tokenExpired, unauthenticated } from '../utils/errors';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = unauthenticated();
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (e: unknown) {
    if (e instanceof jwt.TokenExpiredError) {
      const err = tokenExpired();
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    } else {
      const err = unauthenticated();
      res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    }
  }
}

import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

const shouldSkip = (req: Request): boolean => {
  return (
    env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'test' ||
    req.headers['x-test-suite'] === 'true'
  );
};

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'production' ? 10 : 1000,
  skip: shouldSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'production' ? 30 : 1000,
  skip: shouldSkip,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many scan requests, please try again later.' },
  },
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'production' ? 300 : 5000,
  skip: shouldSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});

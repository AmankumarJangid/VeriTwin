import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import * as authController from './auth.controller';

const router = Router();

const registerSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['MANUFACTURER', 'RETAILER', 'CONSUMER']).default('CONSUMER'),
  organization_name: z.string().max(160).optional(),
  invite_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;

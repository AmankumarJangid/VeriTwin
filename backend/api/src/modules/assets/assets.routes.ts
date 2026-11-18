import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import { notFound, forbidden } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/assets/:kind/:filename — MANUFACTURER only
router.get(
  '/:kind/:filename',
  requireAuth,
  requireRole('MANUFACTURER'),
  (req: Request, res: Response, next: NextFunction) => {
    const { kind, filename } = req.params;
    const allowedKinds = ['originals', 'watermarked', 'qr'];

    if (!allowedKinds.includes(kind)) {
      return next(notFound('Invalid asset kind'));
    }

    // Prevent path traversal: filename must be a 36-char UUID + .png
    if (!/^[0-9a-f-]{36}\.png$/i.test(filename)) {
      return next(notFound('Invalid filename format'));
    }

    const filePath = path.join(env.STORAGE_DIR, kind, filename);
    if (!fs.existsSync(filePath)) {
      return next(notFound('Asset not found'));
    }

    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.resolve(filePath));
  },
);

export default router;

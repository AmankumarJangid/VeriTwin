import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { scanLimiter } from '../../middleware/rateLimit';
import { upload } from '../../middleware/upload';
import * as scanController from './scan.controller';

const router = Router();

// All scanning endpoints require authentication and per-user rate limiting
router.use(requireAuth, scanLimiter);

// POST /api/products/scan-logo (Primary: Watermark)
router.post('/scan-logo', upload.single('image'), scanController.scanLogo);

// POST /api/products/scan-qr (Fallback: Signed QR)
router.post('/scan-qr', scanController.scanQr);

// GET /api/products/twins/:twinId (Refresh twin view)
router.get('/twins/:twinId', scanController.getTwin);

export default router;

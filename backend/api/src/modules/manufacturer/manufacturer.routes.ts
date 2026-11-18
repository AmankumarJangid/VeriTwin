import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { upload } from '../../middleware/upload';

import * as productsController from './products.controller';
import * as batchesController from './batches.controller';
import * as twinsController from './twins.controller';
import * as eventsController from './events.controller';
import * as analyticsController from './analytics.controller';

const router = Router();

// All manufacturer endpoints require authentication and MANUFACTURER role
router.use(requireAuth, requireRole('MANUFACTURER'));

// ─── Products ────────────────────────────────────────────────────────────────
router.post(
  '/products',
  validate(productsController.createProductSchema),
  productsController.createProduct,
);
router.get('/products', productsController.listProducts);
router.get('/products/:productId', productsController.getProduct);
router.patch(
  '/products/:productId',
  validate(productsController.updateProductSchema),
  productsController.updateProduct,
);

// ─── Batches ─────────────────────────────────────────────────────────────────
router.post(
  '/batches',
  validate(batchesController.createBatchSchema),
  batchesController.createBatch,
);
router.get('/batches', batchesController.listBatches);

// ─── Retailers list for Dispatch dropdown ─────────────────────────────────────
router.get('/retailers', analyticsController.listRetailers);

// ─── Digital Twins ───────────────────────────────────────────────────────────
router.post('/twins', upload.single('logo'), twinsController.createTwins);
router.get('/twins', twinsController.listTwins);
router.get('/twins/:twinId', twinsController.getTwinById);

// ─── Events (Single & Bulk) ──────────────────────────────────────────────────
router.post(
  '/twins/:twinId/events',
  validate(eventsController.twinEventSchema),
  eventsController.createTwinEvent,
);
router.post(
  '/batches/:batchId/events',
  validate(eventsController.batchEventSchema),
  eventsController.createBatchEvents,
);

// ─── Analytics, Audit, Integrity ─────────────────────────────────────────────
router.get('/analytics/overview', analyticsController.getAnalyticsOverview);
router.get('/audit', analyticsController.getAuditFeed);
router.get('/twins/:twinId/integrity', analyticsController.checkTwinIntegrity);

export default router;

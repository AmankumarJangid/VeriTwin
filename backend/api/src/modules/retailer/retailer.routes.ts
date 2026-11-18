import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import * as retailerController from './retailer.controller';

const router = Router();

// All retailer endpoints require authentication and RETAILER role
router.use(requireAuth, requireRole('RETAILER'));

// GET /api/retailer/inventory
router.get('/inventory', retailerController.getInventory);

// POST /api/retailer/twins/:twinId/events
router.post(
  '/twins/:twinId/events',
  validate(retailerController.retailerEventSchema),
  retailerController.createRetailerEvent,
);

// GET /api/retailer/consumers/lookup
router.get('/consumers/lookup', retailerController.lookupConsumer);

// POST /api/retailer/twins/:twinId/sell
router.post(
  '/twins/:twinId/sell',
  validate(retailerController.sellSchema),
  retailerController.sellTwin,
);

// GET /api/retailer/sales
router.get('/sales', retailerController.getSales);

export default router;

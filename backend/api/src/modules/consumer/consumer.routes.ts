import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import * as consumerController from './consumer.controller';

const router = Router();

// All consumer endpoints require authentication and CONSUMER role
router.use(requireAuth, requireRole('CONSUMER'));

// GET /api/consumer/vault (Owned twins list)
router.get('/vault', consumerController.getVault);

// GET /api/consumer/vault/:twinId (Owned twin detail)
router.get('/vault/:twinId', consumerController.getVaultTwin);

// POST /api/consumer/transfers (Seller initiates P2P transfer handshake)
router.post(
  '/transfers',
  validate(consumerController.createTransferSchema),
  consumerController.createTransfer,
);

// GET /api/consumer/transfers/:transferId (Seller polls status)
router.get('/transfers/:transferId', consumerController.getTransfer);

// DELETE /api/consumer/transfers/:transferId (Seller cancels transfer)
router.delete('/transfers/:transferId', consumerController.cancelTransfer);

// POST /api/consumer/transfers/claim (Buyer claims transfer)
router.post(
  '/transfers/claim',
  validate(consumerController.claimTransferSchema),
  consumerController.claimTransfer,
);

export default router;

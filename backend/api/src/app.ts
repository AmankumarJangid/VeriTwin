import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from './middleware/requestId';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { pool } from './db/pool';
import * as imageServiceClient from './services/imageServiceClient';

import authRoutes from './modules/auth/auth.routes';
import manufacturerRoutes from './modules/manufacturer/manufacturer.routes';
import retailerRoutes from './modules/retailer/retailer.routes';
import consumerRoutes from './modules/consumer/consumer.routes';
import scanRoutes from './modules/scan/scan.routes';
import assetsRoutes from './modules/assets/assets.routes';

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request tracing
app.use(requestId);

// Global rate limit
app.use(globalLimiter);

// Health check
app.get('/api/health', async (req, res) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  let imageStatus: 'ok' | 'error' = 'ok';

  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'error';
  }

  imageStatus = await imageServiceClient.healthCheck();

  res.json({
    success: true,
    data: {
      api: 'ok',
      db: dbStatus,
      image_service: imageStatus,
      time: new Date().toISOString(),
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manufacturer', manufacturerRoutes);
app.use('/api/retailer', retailerRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/products', scanRoutes);
app.use('/api/assets', assetsRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;

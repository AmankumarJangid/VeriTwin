import 'dotenv/config';
import { env } from './config/env';
import { migrate } from './db/pool';
import { seed } from './db/seed';
import app from './app';

async function start() {
  try {
    await migrate();
    await seed();

    app.listen(env.PORT, () => {
      console.log(`🚀 VeriTwin API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Periodic cleanup of stale P2P transfer tokens every 60 seconds
    setInterval(async () => {
      try {
        const { expireStaleTokens } = await import('./services/transferTokens');
        await expireStaleTokens();
      } catch (tokenErr) {
        // Log and continue
      }
    }, 60 * 1000);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

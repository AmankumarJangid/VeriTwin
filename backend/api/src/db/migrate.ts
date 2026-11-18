import { pool } from '../db/pool';
import { migrate } from '../db/pool';

// Standalone migrate script
migrate()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

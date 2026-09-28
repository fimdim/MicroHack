import { Router } from 'express';
import { getDatabase } from '../db/sqlite';

const router = Router();

router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  try {
    if (process.env.SIMULATE_DEPENDENCY_FAILURE === 'true') {
      throw new Error('Simulated database dependency failure');
    }

    const database = await getDatabase();
    await database.get('SELECT 1');

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      checks: {
        database: 'failed',
      },
    });
  }
});

export default router;

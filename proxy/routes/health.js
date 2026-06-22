import { Router } from 'express';
import { MOCK } from '../config.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, mock: MOCK, timestamp: Date.now() });
});

export default router;

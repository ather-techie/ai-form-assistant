import { Router }      from 'express';
import { FEATURE_FLAGS } from '../config.js';

const router = Router();

router.get('/v1/flags', (_req, res) => {
  res.json(FEATURE_FLAGS);
});

export default router;

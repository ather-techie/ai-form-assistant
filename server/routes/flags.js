import { Router }      from 'express';
import { FEATURE_FLAGS } from '../config.js';
import { ENDPOINTS }    from '@aifa/contract';

const router = Router();

router.get(ENDPOINTS.FLAGS, (_req, res) => {
  res.json(FEATURE_FLAGS);
});

export default router;

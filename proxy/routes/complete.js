import { Router } from 'express';
import { MOCK, ENV_KEYS } from '../config.js';
import { buildUpstreamRequest } from '../lib/requestBuilder.js';
import { pipeUpstream } from '../lib/streaming.js';
import { serveMock } from '../lib/mock.js';
import { sendSseError } from '../lib/utils.js';

const router = Router();

router.post('/v1/complete', async (req, res) => {
  const { provider, model, messages, schema, stream = true, apiKey: bodyKey, localLlmHost, localLlmPort } = req.body;
  const apiKey = bodyKey || ENV_KEYS[provider] || null;

  if (!provider || !messages) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'provider and messages are required.' });
  }

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (MOCK) {
    return serveMock(res, model, provider);
  }

  if (!apiKey && provider !== 'local') {
    return sendSseError(res, { status: 401, message: 'No API key provided. Set one in the extension Settings or in proxy/.env.' });
  }

  try {
    const { url, headers, body } = buildUpstreamRequest(provider, model, messages, schema, apiKey, { localLlmHost, localLlmPort });
    await pipeUpstream(url, headers, body, provider, model, res);
  } catch (err) {
    sendSseError(res, err);
  }
});

export default router;

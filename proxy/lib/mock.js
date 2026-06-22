import { MOCK_INTERVAL_MS } from '../config.js';

export function serveMock(res, model, provider) {
  const tokens = ['This ', 'is ', 'a ', 'mock ', 'AI ', 'response ', 'for ', 'testing.'];
  let   i      = 0;

  const iv = setInterval(() => {
    if (i < tokens.length) {
      res.write(`data: ${JSON.stringify({ text: tokens[i++] })}\n\n`);
    } else {
      clearInterval(iv);
      res.write(`data: __usage__:${JSON.stringify({ inputTokens: 42, outputTokens: 18, model, provider })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }, MOCK_INTERVAL_MS);

  res.on('close', () => clearInterval(iv));
}

import { SSE } from '@aifa/contract';

export function sendSseError(res, err) {
  const code    = err.status ?? 500;
  const message = err.message ?? 'Internal proxy error.';
  res.write(`data: ${SSE.ERROR}:${JSON.stringify({ code, message })}\n\n`);
  res.end();
}

export function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

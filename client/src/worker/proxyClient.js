/**
 * proxyClient.js — fetch() wrapper for the local proxy.
 * Handles SSE streaming, token forwarding via port, __usage__ event,
 * and one reconnect attempt on stream drop.
 */

import { PROXY_ENDPOINT, SSE_DONE, SSE_USAGE, SSE_ERROR } from '../shared/constants.js';
import { normalise as normaliseError } from './errorHandler.js';

const FETCH_TIMEOUT_MS = 30_000;

/**
 * Streams a completion request through the local proxy.
 *
 * @param {object}   opts
 * @param {string}   opts.proxyUrl   - e.g. 'http://localhost:3000'
 * @param {object}   opts.body       - Full request body (from adapter.normalise())
 * @param {string}   opts.provider   - Provider name for error context
 * @param {chrome.runtime.Port} opts.port  - Keepalive/stream port to sidebar
 * @param {string}   [opts.lastEventId]   - For SSE reconnect
 * @returns {Promise<{ inputTokens, outputTokens } | null>}
 */
export async function streamCompletion(opts) {
  const { proxyUrl, body, provider, port } = opts;
  const url = `${proxyUrl}${PROXY_ENDPOINT}`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.lastEventId ? { 'Last-Event-ID': opts.lastEventId } : {}),
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw normaliseError(err, provider);
  }

  clearTimeout(timeout);

  if (!res.ok) {
    throw normaliseError(res, provider);
  }

  return readStream(res.body, provider, port, opts, false);
}

// ─── SSE stream reader ────────────────────────────────────────────────────────

async function readStream(body, provider, port, opts, isRetry) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let   buf     = '';
  let   usage   = null;
  let   lastId  = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // SSE comment / empty

        if (trimmed.startsWith('id:')) {
          lastId = trimmed.slice(3).trim();
          continue;
        }

        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();

        if (data === SSE_DONE) break;

        if (data.startsWith(`${SSE_ERROR}`)) {
          const payload = safeJson(data.replace(`${SSE_ERROR}:`, '').trim());
          throw normaliseError({ code: payload?.code, message: payload?.message }, provider);
        }

        if (data.startsWith(`${SSE_USAGE}`)) {
          usage = safeJson(data.replace(`${SSE_USAGE}:`, '').trim());
          continue;
        }

        // Regular token — forward to sidebar via port
        const parsed = safeJson(data);
        if (parsed?.text) {
          try { port.postMessage({ type: 'token', text: parsed.text }); } catch { /* port closed */ }
        }
      }
    }
  } catch (err) {
    // Attempt one reconnect on stream drop
    if (!isRetry) {
      try {
        port.postMessage({ type: 'reconnecting' });
        const res2 = await fetch(`${opts.proxyUrl}${PROXY_ENDPOINT}`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(lastId ? { 'Last-Event-ID': lastId } : {}),
          },
          body: JSON.stringify(opts.body),
        });
        if (res2.ok) return readStream(res2.body, provider, port, opts, true);
      } catch { /* fall through to original error */ }
    }
    throw normaliseError(err, provider);
  }

  return usage;
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

/**
 * errorHandler.js — Normalises all error sources to a single ErrorEvent shape.
 * { code, message, retryable, provider, timestamp }
 */

import { ERR } from '../shared/constants.js';

// ─── Normalise any thrown value to ErrorEvent ─────────────────────────────────

export function normalise(err, provider = null) {
  // Already normalised
  if (err?.code && ERR[err.code]) return err;

  const base = { provider, timestamp: Date.now() };

  // HTTP Response object
  if (err instanceof Response || err?.status) {
    return fromHttpStatus(err.status ?? err, base);
  }

  // Network / fetch failure
  if (err instanceof TypeError) {
    return { ...base, code: ERR.PROXY_UNREACHABLE, message: 'Could not reach the proxy. Is your local server running?', retryable: true };
  }

  // JSON parse failure
  if (err instanceof SyntaxError) {
    return { ...base, code: ERR.MALFORMED_RESPONSE, message: 'Unexpected response from provider.', retryable: true };
  }

  // chrome.runtime / storage errors
  if (typeof err === 'string' && err.includes('storage')) {
    return { ...base, code: ERR.STORAGE_ERROR, message: 'Could not save data — storage may be full.', retryable: false };
  }

  // Port disconnect / stream drop
  if (err?.message?.includes('port') || err?.message?.includes('stream')) {
    return { ...base, code: ERR.STREAM_INTERRUPTED, message: 'Connection dropped.', retryable: true };
  }

  // DOM / content script errors
  if (err?.message?.includes('Cannot access') || err?.message?.includes('frame')) {
    return { ...base, code: ERR.CONTENT_SCRIPT_ERROR, message: "Could not read this page's form fields.", retryable: false };
  }

  // Fetch timeout (AbortError)
  if (err?.name === 'AbortError') {
    return { ...base, code: ERR.TIMEOUT, message: 'Request timed out.', retryable: true };
  }

  // Generic fallback
  return { ...base, code: ERR.MALFORMED_RESPONSE, message: err?.message ?? 'An unknown error occurred.', retryable: true };
}

// ─── HTTP status → ErrorEvent ─────────────────────────────────────────────────

function fromHttpStatus(status, base) {
  if (status === 401 || status === 403) {
    return { ...base, code: ERR.AUTH_FAILED,        message: 'API key rejected. Check your key in Settings.', retryable: false };
  }
  if (status === 429) {
    return { ...base, code: ERR.RATE_LIMIT,         message: 'Rate limited by provider.',                     retryable: true  };
  }
  if (status === 408 || status === 504) {
    return { ...base, code: ERR.TIMEOUT,            message: 'Request timed out.',                            retryable: true  };
  }
  if (status >= 500) {
    return { ...base, code: ERR.PROXY_UNREACHABLE,  message: `Provider error (${status}).`,                   retryable: true  };
  }
  return   { ...base, code: ERR.MALFORMED_RESPONSE, message: `Unexpected status ${status}.`,                  retryable: true  };
}

// ─── Retry delay per error code ───────────────────────────────────────────────

export function getRetryDelay(code) {
  const delays = {
    [ERR.RATE_LIMIT]:  5_000,
    [ERR.TIMEOUT]:     2_000,
    [ERR.MALFORMED_RESPONSE]: 1_000,
    [ERR.PROXY_UNREACHABLE]:  3_000,
    [ERR.STREAM_INTERRUPTED]: 1_500,
  };
  return delays[code] ?? 2_000;
}

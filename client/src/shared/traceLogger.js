/**
 * traceLogger.js — Lightweight trace event logger for fill-form debugging.
 * Uses chrome.storage.session (no rate limit, clears on browser restart).
 * All writes are noops when traceEnabled is false, so there is zero overhead
 * in normal usage.
 */

const TRACE_KEY  = 'ai_ext:trace_log';
const MAX_SESSIONS = 5;

/**
 * Creates a session ID. Call once at the start of each fill operation.
 * The ID is just a timestamp; the domain is stored in the first event.
 */
export function createTraceSession() {
  return String(Date.now());
}

/**
 * Appends an event to an existing session (or opens a new one).
 * Noops when traceEnabled is false.
 *
 * @param {string}  sessionId     - From createTraceSession()
 * @param {string}  type          - Event type label
 * @param {object}  data          - Arbitrary payload
 * @param {boolean} traceEnabled  - Feature flag gate
 */
export async function addTraceEvent(sessionId, type, data, traceEnabled) {
  if (!traceEnabled) return;

  // eslint-disable-next-line no-console
  console.log('[AIFA trace]', type, data);

  const ts      = Date.now();
  const r       = await chrome.storage.session.get(TRACE_KEY);
  const sessions = r[TRACE_KEY] ?? [];

  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx].events.push({ type, data, ts });
  } else {
    sessions.push({
      id:        sessionId,
      domain:    data.domain ?? '(unknown)',
      startedAt: ts,
      events:    [{ type, data, ts }],
    });
  }

  await chrome.storage.session.set({ [TRACE_KEY]: sessions.slice(-MAX_SESSIONS) });
}

/** Returns up to 5 sessions, most recent first. */
export async function getTraceSessions() {
  const r = await chrome.storage.session.get(TRACE_KEY);
  return (r[TRACE_KEY] ?? []).slice().reverse();
}

/** Removes all stored trace sessions. */
export async function clearTraceSessions() {
  await chrome.storage.session.remove(TRACE_KEY);
}

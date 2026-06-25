/**
 * keepalive.js — Prevents MV3 service worker suspension during SSE streaming.
 * The sidebar opens a chrome.runtime.connect() port at stream start and
 * sends a ping every 20s. Service worker responds to keep itself alive.
 */

import { KEEPALIVE_INTERVAL_MS, MSG } from '../shared/constants.js';

let _interval = null;

/**
 * Called by the service worker when a keepalive port connects.
 * Starts sending pings on the port to prevent SW suspension.
 * @param {chrome.runtime.Port} port
 */
export function startKeepalive(port) {
  stopKeepalive(); // clear any previous interval

  _interval = setInterval(() => {
    try {
      port.postMessage({ type: MSG.PING });
    } catch {
      // Port already disconnected — stop pinging
      stopKeepalive();
    }
  }, KEEPALIVE_INTERVAL_MS);

  port.onDisconnect.addListener(() => {
    stopKeepalive();
  });
}

/**
 * Stops the keepalive interval. Safe to call if not running.
 */
export function stopKeepalive() {
  if (_interval !== null) {
    clearInterval(_interval);
    _interval = null;
  }
}

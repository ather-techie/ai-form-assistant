/**
 * requestQueue.js — Serial FIFO queue stored in chrome.storage.session.
 * Prevents concurrent AI requests that would interleave SSE streams.
 */

const QUEUE_KEY = 'ai_ext:request_queue';

// ─── Public API ───────────────────────────────────────────────────────────────

export async function enqueue(item) {
  const queue = await _getQueue();
  const id    = `req_${Date.now()}_${Math.floor(Math.random() * 0xffff).toString(16)}`;
  queue.push({ ...item, id, enqueued: Date.now(), _claimed: false });
  await _setQueue(queue);
  return { queued: true, id };
}

export async function claimNext() {
  const queue = await _getQueue();
  const next  = queue.find(i => !i._claimed);
  if (!next) return null;
  next._claimed = true;
  await _setQueue(queue);
  return next;
}

export async function complete(id) {
  const queue    = await _getQueue();
  const filtered = queue.filter(i => i.id !== id);
  await _setQueue(filtered);
}

export async function pendingCount() {
  const queue = await _getQueue();
  return queue.filter(i => !i._claimed).length;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _getQueue() {
  const r = await chrome.storage.session.get(QUEUE_KEY);
  return r[QUEUE_KEY] ?? [];
}

async function _setQueue(queue) {
  await chrome.storage.session.set({ [QUEUE_KEY]: queue });
}

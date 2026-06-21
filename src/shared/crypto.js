/**
 * crypto.js — AES-GCM 256-bit session-key encryption via Web Crypto API.
 * The CryptoKey never leaves session storage (exported as JWK, re-imported per SW lifetime).
 */

const KEY_ALGO    = { name: 'AES-GCM', length: 256 };
const SESSION_KEY = 'ai_ext:session_key';

// ─── Key lifecycle ────────────────────────────────────────────────────────────

export async function getOrCreateSessionKey() {
  const existing = await loadSessionKey();
  if (existing) return existing;

  const key      = await crypto.subtle.generateKey(KEY_ALGO, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.session.set({ [SESSION_KEY]: exported });
  return key;
}

export async function loadSessionKey() {
  const r   = await chrome.storage.session.get(SESSION_KEY);
  const jwk = r[SESSION_KEY];
  if (!jwk) return null;
  try {
    return await crypto.subtle.importKey('jwk', jwk, KEY_ALGO, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

// ─── Encrypt / decrypt ────────────────────────────────────────────────────────

export async function encrypt(plaintext, key) {
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  return {
    iv:         _toBase64(iv),
    ciphertext: _toBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decrypt({ iv, ciphertext }, key) {
  const ivBytes = _fromBase64(iv);
  const ctBytes = _fromBase64(ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ctBytes,
  );

  return new TextDecoder().decode(decrypted);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function _fromBase64(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

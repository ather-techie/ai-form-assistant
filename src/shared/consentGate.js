/**
 * consentGate.js — Logs user consent events before AI field injection.
 * All consent entries persist in chrome.storage.local for audit purposes.
 */

const CONSENT_KEY = 'ai_ext:consent_log';

export async function recordConsent({ field, value, domain, templateId, source }) {
  const log     = await getConsentLog();
  const entry   = {
    field,
    value:      typeof value === 'string' ? value.slice(0, 200) : String(value ?? '').slice(0, 200),
    domain,
    templateId,
    source,
    timestamp:  Date.now(),
  };
  const trimmed = [...log, entry].slice(-200);
  await chrome.storage.local.set({ [CONSENT_KEY]: trimmed });
}

export async function getConsentLog() {
  const r = await chrome.storage.local.get(CONSENT_KEY);
  return r[CONSENT_KEY] ?? [];
}

export async function clearConsentLog() {
  await chrome.storage.local.remove(CONSENT_KEY);
}

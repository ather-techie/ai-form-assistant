/**
 * storage.js — Typed wrappers over chrome.storage.local and .session.
 * All chat history is staged in session (fast, no rate limit) and
 * flushed to local on stream completion.
 */

import { DEFAULT_SETTINGS, DEFAULT_TEMPLATE_ID } from './constants.js';

// ─── Key builders ─────────────────────────────────────────────────────────────

const K = {
  settings:  'ai_ext:settings',
  profile:   id     => `ai_ext:profile:${id}`,
  templates: 'ai_ext:templates',
  tokenLog:  'ai_ext:token_log',
  chat:      domain => `ai_ext:chat:${domain}`,
  fieldMap:  domain => `ai_ext:fields:${domain}`,
  consent:   'ai_ext:consent_log',
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  const r      = await chrome.storage.local.get(K.settings);
  const stored = r[K.settings] ?? {};
  const mergedFeatures = { ...DEFAULT_SETTINGS.features, ...(stored.features ?? {}) };
  // One-time migration: costDisplayEnabled → features.costDisplay
  if ('costDisplayEnabled' in stored && !('costDisplay' in (stored.features ?? {}))) {
    mergedFeatures.costDisplay = stored.costDisplayEnabled;
  }
  return { ...DEFAULT_SETTINGS, ...stored, features: mergedFeatures };
}

export async function saveSettings(patch) {
  // Special key __templates is a shorthand for saving the template index
  if (patch.__templates) {
    await chrome.storage.local.set({ [K.templates]: patch.__templates });
    const rest = { ...patch };
    delete rest.__templates;
    if (Object.keys(rest).length === 0) return;
    patch = rest;
  }
  const current = await getSettings();
  await chrome.storage.local.set({ [K.settings]: { ...current, ...patch } });
}

// ─── Profile & templates ──────────────────────────────────────────────────────

export async function getProfile(templateId = DEFAULT_TEMPLATE_ID) {
  const r = await chrome.storage.local.get(K.profile(templateId));
  return r[K.profile(templateId)] ?? {
    id:     templateId,
    name:   templateId === DEFAULT_TEMPLATE_ID ? 'Default' : templateId,
    fields: {},
  };
}

export async function saveProfileField(templateId, field, value) {
  const profile = await getProfile(templateId);

  if (field.startsWith('__delete__')) {
    const key = field.slice('__delete__'.length);
    delete profile.fields[key];
  } else {
    profile.fields[field] = value;
  }

  await chrome.storage.local.set({ [K.profile(templateId)]: profile });
}

export async function getTemplates() {
  const r = await chrome.storage.local.get(K.templates);
  return r[K.templates] ?? [
    { id: DEFAULT_TEMPLATE_ID, name: 'Default', createdAt: 0 },
  ];
}

// ─── Token log ────────────────────────────────────────────────────────────────

export async function getTokenLog() {
  const r = await chrome.storage.local.get(K.tokenLog);
  return r[K.tokenLog] ?? [];
}

export async function appendTokenLog(entry) {
  const log     = await getTokenLog();
  const trimmed = [...log, { ...entry, timestamp: Date.now() }].slice(-100);
  await chrome.storage.local.set({ [K.tokenLog]: trimmed });
}

// ─── Chat history ─────────────────────────────────────────────────────────────

export async function appendChatSession(domain, message) {
  const history = await getChatHistory(domain);
  const updated = [...history, message].slice(-50);
  await chrome.storage.session.set({ [K.chat(domain)]: updated });
}

export async function flushChatToLocal(domain) {
  const r       = await chrome.storage.session.get(K.chat(domain));
  const history = r[K.chat(domain)] ?? [];
  await chrome.storage.local.set({ [K.chat(domain)]: history });
}

export async function getChatHistory(domain) {
  // Session is preferred (faster and survives SW restart within a browser session)
  const rs = await chrome.storage.session.get(K.chat(domain));
  if (rs[K.chat(domain)]?.length) return rs[K.chat(domain)];

  const rl = await chrome.storage.local.get(K.chat(domain));
  return rl[K.chat(domain)] ?? [];
}

// ─── Field map ────────────────────────────────────────────────────────────────

export async function getFieldMap(domain) {
  const r = await chrome.storage.local.get(K.fieldMap(domain));
  return r[K.fieldMap(domain)] ?? {};
}

export async function setFieldMap(domain, map) {
  await chrome.storage.local.set({ [K.fieldMap(domain)]: map });
}

// ─── Clear all ────────────────────────────────────────────────────────────────

export async function clearAllData() {
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
}

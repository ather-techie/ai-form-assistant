/**
 * serviceWorker.js — MV3 orchestrator.
 * Handles all message types, keepalive, request queue, and AI streaming.
 */

import { MSG, ERR, KEEPALIVE_PORT_NAME, STORAGE_KEYS } from '../shared/constants.js';
import { getSettings, saveSettings, getProfile, saveProfileField,
         getTemplates, getTokenLog, clearAllData,
         appendTokenLog, setFieldMap, getFieldMap,
         flushChatToLocal, appendChatSession }          from '../shared/storage.js';
import { getOrCreateSessionKey, loadSessionKey,
         encrypt, decrypt }                             from '../shared/crypto.js';
import { enqueue, claimNext, complete, pendingCount }   from '../shared/requestQueue.js';
import { recordConsent }                                from '../shared/consentGate.js';
import { startKeepalive, stopKeepalive }                from './keepalive.js';
import { streamCompletion }                             from './proxyClient.js';
import { buildContext, buildClassifyContext }           from './contextBuilder.js';
import { routeFields }                                  from './fieldRouter.js';
import { normalise as normaliseError }                  from './errorHandler.js';
import { getAdapter }                                   from '../adapters/index.js';
import { estimateCost }                                 from '../shared/constants.js';

// ─── State (in-memory only — survives within a SW lifetime) ──────────────────

let _sessionKey  = null;   // CryptoKey — null if browser restarted
let _keepalivePort = null;

// ─── SW Startup ───────────────────────────────────────────────────────────────

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

self.addEventListener('activate', async () => {
  _sessionKey = await loadSessionKey();
  // null means browser restarted — sidebar will show re-entry prompt
});

// ─── Keepalive port ───────────────────────────────────────────────────────────

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== KEEPALIVE_PORT_NAME) return;
  _keepalivePort = port;
  startKeepalive(port);
  port.onDisconnect.addListener(() => {
    stopKeepalive();
    _keepalivePort = null;
  });
  // Respond to pings from sidebar
  port.onMessage.addListener(msg => {
    if (msg.type === MSG.PING) {
      try { port.postMessage({ type: MSG.PONG }); } catch { /* port closed */ }
    }
  });
});

// ─── Message dispatcher ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    sendResponse({ error: normaliseError(err) });
  });
  return true; // keep channel open for async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    case MSG.FILL_FORM:       return handleFillForm(msg);
    case MSG.CHAT_MESSAGE:    return handleChat(msg);
    case MSG.CLASSIFY_FIELDS: return handleClassify(msg);
    case MSG.SAVE_FIELD:      return handleSaveField(msg);
    case MSG.GET_PROFILE:     return handleGetProfile(msg);
    case MSG.UPDATE_SETTINGS: return handleUpdateSettings(msg);
    case MSG.TEST_CONNECTION: return handleTestConnection(msg);
    case MSG.GET_TOKEN_USAGE: return { log: await getTokenLog() };
    case MSG.CLEAR_DATA:      return handleClearData();
    default:                  return { error: `Unknown message type: ${msg.type}` };
  }
}

// ─── FILL_FORM ────────────────────────────────────────────────────────────────

async function handleFillForm({ domain, pageTitle, fields, templateId, userNote }) {
  const result = await enqueue({ type: MSG.FILL_FORM, domain, payload: { fields, templateId } });
  if (!result.queued) return { queued: false, reason: result.reason };

  const item = await claimNext();
  if (!item) return { queued: false, reason: 'Queue empty.' };

  try {
    const { static: staticFields, smart, preview } = await routeFields(fields, templateId);

    // If there are preview (low-confidence) fields, return them to sidebar first
    // Sidebar will show PromptPreview modal and re-trigger with confirmed fields
    if (preview.length > 0) {
      await complete(item.id);
      return { needsPreview: true, previewFields: preview, staticFields, smartFields: smart };
    }

    // No preview needed — go straight to AI for smart fields
    const aiValues = smart.length > 0
      ? await callAI({ fields: smart, domain, pageTitle, templateId, userNote })
      : {};

    await complete(item.id);
    return {
      success:      true,
      staticFields,
      aiValues,
      pendingCount: await pendingCount(),
    };
  } catch (err) {
    await complete(item.id);
    throw err;
  }
}

// ─── CHAT_MESSAGE ─────────────────────────────────────────────────────────────

async function handleChat({ domain, content, pageTitle }) {
  const result = await enqueue({ type: MSG.CHAT_MESSAGE, domain, payload: { content } });
  if (!result.queued) return { queued: false, reason: result.reason };

  const item = await claimNext();
  if (!item) return { queued: false, reason: 'Queue empty.' };

  try {
    await appendChatSession(domain, { role: 'user', content, timestamp: Date.now() });

    const settings  = await getSettings();
    const apiKey    = await getDecryptedKey(settings);
    const adapter   = getAdapter(settings.provider);
    const history   = [{ role: 'user', content }];
    const { url, headers, body } = adapter.normalise(history, null, { ...settings, apiKey });

    const usage = await streamCompletion({
      proxyUrl: settings.proxyUrl,
      body:     { ...JSON.parse(body), provider: settings.provider, model: settings.model, apiKey },
      provider: settings.provider,
      port:     _keepalivePort,
    });

    if (usage) await logUsage(settings, usage);
    await flushChatToLocal(domain);
    await complete(item.id);
    return { success: true };
  } catch (err) {
    await complete(item.id);
    throw err;
  }
}

// ─── CLASSIFY_FIELDS ──────────────────────────────────────────────────────────

async function handleClassify({ fields, domain }) {
  const settings  = await getSettings();
  const apiKey    = await getDecryptedKey(settings);
  const adapter   = getAdapter(settings.provider);
  const messages  = buildClassifyContext(fields);
  const { body }  = adapter.normalise(messages, null, { ...settings, apiKey });

  // Non-streaming classification call
  const res = await fetch(`${settings.proxyUrl}${'/v1/complete'}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...JSON.parse(body), provider: settings.provider, stream: false, apiKey }),
  });

  if (!res.ok) throw normaliseError(res, settings.provider);
  const data = await res.json();

  // Cache result
  const existing = await getFieldMap(domain);
  const updated  = { ...existing };
  for (const [id, classification] of Object.entries(data)) {
    updated[id] = { classification, lastSeen: Date.now() };
  }
  await setFieldMap(domain, updated);

  return { classifications: data };
}

// ─── SAVE_FIELD ───────────────────────────────────────────────────────────────

async function handleSaveField({ field, value, domain, templateId, source }) {
  await saveProfileField(templateId, field, value);
  await recordConsent({ field, value, domain, templateId, source });
  return { success: true };
}

// ─── GET_PROFILE ──────────────────────────────────────────────────────────────

async function handleGetProfile({ templateId }) {
  const [profile, templates] = await Promise.all([
    getProfile(templateId),
    getTemplates(),
  ]);
  return { profile, templates };
}

// ─── UPDATE_SETTINGS ──────────────────────────────────────────────────────────

async function handleUpdateSettings({ settings: patch }) {
  // If a new plaintext API key is provided, encrypt it first
  if (patch.apiKeyPlaintext) {
    const key = await getOrCreateSessionKey();
    _sessionKey = key;
    const { iv, ciphertext } = await encrypt(patch.apiKeyPlaintext, key);
    delete patch.apiKeyPlaintext;
    patch.apiKeyCiphertext = ciphertext;
    patch.apiKeyIv         = iv;
  }
  await saveSettings(patch);
  return { success: true };
}

// ─── TEST_CONNECTION ──────────────────────────────────────────────────────────

async function handleTestConnection() {
  const settings = await getSettings();
  const start    = Date.now();
  try {
    const res = await fetch(`${settings.proxyUrl}/health`, { method: 'GET' });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: normaliseError(err, null).message };
  }
}

// ─── CLEAR_DATA ───────────────────────────────────────────────────────────────

async function handleClearData() {
  await clearAllData();
  _sessionKey = null;
  return { success: true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDecryptedKey(settings) {
  if (!settings.apiKeyCiphertext) return null;
  if (!_sessionKey) {
    _sessionKey = await loadSessionKey();
    if (!_sessionKey) {
      throw normaliseError(
        { code: ERR.AUTH_FAILED, message: 'Session expired — please re-enter your API key in Settings.', retryable: false },
      );
    }
  }
  return decrypt({ iv: settings.apiKeyIv, ciphertext: settings.apiKeyCiphertext }, _sessionKey);
}

async function callAI({ fields, domain, pageTitle, templateId, userNote }) {
  const settings              = await getSettings();
  const apiKey                = await getDecryptedKey(settings);
  const adapter               = getAdapter(settings.provider);
  const { messages, schema }  = await buildContext({ fields, domain, pageTitle, templateId, userNote });
  const { body }              = adapter.normalise(messages, schema, { ...settings, apiKey });

  const usage = await streamCompletion({
    proxyUrl: settings.proxyUrl,
    body:     { ...JSON.parse(body), provider: settings.provider, model: settings.model, apiKey },
    provider: settings.provider,
    port:     _keepalivePort,
  });

  if (usage) await logUsage(settings, usage);
  return {};   // actual values arrive via SSE tokens to sidebar
}

async function logUsage(settings, usage) {
  await appendTokenLog({
    provider:      settings.provider,
    model:         settings.model,
    inputTokens:   usage.inputTokens,
    outputTokens:  usage.outputTokens,
    estimatedCost: estimateCost(settings.model, usage.inputTokens, usage.outputTokens),
  });
}

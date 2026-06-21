# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Form Assistant is a Chrome extension (Manifest V3) that uses AI to detect and fill web forms with user profile data. It supports Claude, OpenAI, Gemini, and local models (Ollama/LM Studio) via a local Express proxy.

## Commands

### Extension

```bash
npm install          # Install extension dependencies
npm run dev          # Watch mode build (Vite)
npm run build        # Production build → dist/
npm run gen-icons    # Generate placeholder PNG icons (one-time setup)
```

### Proxy Server (required for AI requests)

```bash
cd proxy && npm install
npm run mock         # Development: fake responses, no API keys needed
npm run start        # Production: real API keys required
```

### Load in Chrome

1. `chrome://extensions` → Enable Developer mode
2. "Load unpacked" → select `dist/`
3. Open sidebar → Settings → Test Connection → ✓

No linting or testing framework is configured.

## Architecture

### Message Flow

```
Sidebar UI (React)
    ↓ chrome.runtime.sendMessage
Service Worker (orchestrator)
    ↓ fieldRouter: bucket fields → static / smart / preview
    ↓ proxyClient: SSE stream to localhost:3000
Proxy (Express)
    ↓ pipe to Claude / OpenAI / Gemini API
    ↑ SSE tokens forwarded to sidebar via long-lived port
Content Script
    ↑ injects values into DOM (property setter interception for React/Vue)
```

### Key Directories

- `src/shared/` — No-UI utilities: constants, AES-GCM crypto, storage wrappers, request queue, consent gate
- `src/adapters/` — One file per AI provider (`claude.js`, `openai.js`, `gemini.js`, `local.js`) plus `index.js` (AdapterRegistry)
- `src/worker/` — Service worker: message dispatcher, keepalive, proxy client, context builder, field router, error handler
- `src/content/` — Content script: field scanner, field injector, self-contained IIFE
- `src/sidebar/` — React side panel (ChatPanel, ProfilePanel, SettingsPanel, AuditPanel, CostBadge)
- `src/options/` — Full-page options UI (reuses sidebar components)
- `proxy/` — Express server on `localhost:3000`

### Storage Split

- **`chrome.storage.session`** — Request queue, staged chat history, session crypto key. No rate limit; cleared on browser restart.
- **`chrome.storage.local`** — Settings, profiles, templates, token log, consent log. Limited to 120 writes/min; writes are coalesced in `src/shared/storage.js`.

### Concurrency

`src/shared/requestQueue.js` enforces a serial FIFO queue stored in session storage. All AI requests must go through it to prevent interleaved SSE streams.

### Adding a New AI Provider

1. Create `src/adapters/myprovider.js` exporting `normalise(payload)` and `parseUsage(response)`
2. Import and register in `src/adapters/index.js`
3. Add models and cost entries to `MODELS` and `COST_TABLE` in `src/shared/constants.js`
4. The service worker and proxy require no changes

### Service Worker Keepalive

MV3 service workers suspend after ~30s of inactivity. The sidebar holds a long-lived port and pings every 20s (`MSG.PING`) via `src/worker/keepalive.js` to keep the SW alive during streaming.

### Content Script Safety

`src/content/content.js` guards against double-injection with `window.__aiFormAssistantLoaded`. Field values are injected by intercepting property setters so frameworks like React and Vue pick up the changes; synthetic `input` and `change` events are dispatched afterward.

### Error Shape

All errors are normalized to `{ code, message, retryable, provider, timestamp }` in `src/worker/errorHandler.js`. Use `getRetryDelay(code)` for appropriate backoff.

### Proxy MOCK Mode

`cd proxy && npm run mock` returns fake SSE responses without hitting any upstream API. Use this during UI or content script development to avoid needing API keys.

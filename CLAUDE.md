# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Form Assistant is a Chrome extension (Manifest V3) that uses AI to detect and fill web forms with user profile data. It supports Claude, OpenAI, Gemini, and local models (Ollama/LM Studio) via a local Express proxy.

This is a single npm-workspaces monorepo with two independently-deployed halves and one shared package:

- `client/` — the Chrome extension (Vite + React)
- `server/` — the Express proxy (`localhost:3000`)
- `shared/` — `@aifa/contract`: the wire contract (providers, endpoint paths, SSE sentinels) imported by both halves. Edit it once; both sides stay in sync.

## Commands

All commands run from the repo root. `npm install` once at the root installs all three workspaces.

### Extension (client)

```bash
npm install          # Install all workspaces (root, client, server, shared)
npm run dev          # Watch mode build (Vite) → dist/
npm run build        # Production build → dist/
npm run gen-icons    # Generate placeholder PNG icons (one-time setup)
```

### Proxy Server (required for AI requests)

```bash
npm run proxy:mock   # Development: fake responses, no API keys needed
npm run proxy        # Production: real API keys required (server/.env)
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
Proxy (Express, server/)
    ↓ pipe to Claude / OpenAI / Gemini API
    ↑ SSE tokens forwarded to sidebar via long-lived port
Content Script
    ↑ injects values into DOM (property setter interception for React/Vue)
```

### Key Directories

- `client/src/shared/` — No-UI utilities: constants, AES-GCM crypto, storage wrappers, request queue, consent gate
- `client/src/adapters/` — One file per AI provider (`claude.js`, `openai.js`, `gemini.js`, `local.js`) plus `index.js` (AdapterRegistry)
- `client/src/worker/` — Service worker: message dispatcher, keepalive, proxy client, context builder, field router, error handler
- `client/src/content/` — Content script: field scanner, field injector, self-contained IIFE
- `client/src/sidebar/` — React side panel (ChatPanel, ProfilePanel, SettingsPanel, AuditPanel, CostBadge)
- `client/src/options/` — Full-page options UI (reuses sidebar components)
- `server/` — Express server on `localhost:3000`
- `shared/` — `@aifa/contract`: providers, endpoint paths, SSE sentinels shared by client and server

### Storage Split

- **`chrome.storage.session`** — Request queue, staged chat history, session crypto key. No rate limit; cleared on browser restart.
- **`chrome.storage.local`** — Settings, profiles, templates, token log, consent log. Limited to 120 writes/min; writes are coalesced in `client/src/shared/storage.js`.

### Concurrency

`client/src/shared/requestQueue.js` enforces a serial FIFO queue stored in session storage. All AI requests must go through it to prevent interleaved SSE streams.

### Adding a New AI Provider

1. Create `client/src/adapters/myprovider.js` exporting `normalise(payload)` and `parseUsage(response)`
2. Import and register in `client/src/adapters/index.js`
3. Add models and cost entries to `MODELS` and `COST_TABLE` in `client/src/shared/constants.js` (UI-only — the proxy switches on provider, not model)
4. The service worker and proxy require no changes

### Service Worker Keepalive

MV3 service workers suspend after ~30s of inactivity. The sidebar holds a long-lived port and pings every 20s (`MSG.PING`) via `client/src/worker/keepalive.js` to keep the SW alive during streaming.

### Content Script Safety

`client/src/content/content.js` guards against double-injection with `window.__aiFormAssistantLoaded`. Field values are injected by intercepting property setters so frameworks like React and Vue pick up the changes; synthetic `input` and `change` events are dispatched afterward.

### Error Shape

All errors are normalized to `{ code, message, retryable, provider, timestamp }` in `client/src/worker/errorHandler.js`. Use `getRetryDelay(code)` for appropriate backoff.

### Proxy MOCK Mode

`npm run proxy:mock` (from the repo root) returns fake SSE responses without hitting any upstream API. Use this during UI or content script development to avoid needing API keys.

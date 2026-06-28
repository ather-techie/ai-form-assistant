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
    ↓ proxyClient: SSE stream to localhost:3000/v1/complete
Proxy (Express, server/)
    ├── POST /v1/complete  → pipe to Claude / OpenAI / Gemini API (SSE)
    ├── POST /v1/extract   → PDF/DOCX → extracted JSON fields
    └── GET  /v1/flags     → feature flag object
    ↑ SSE tokens forwarded to sidebar via long-lived port
Content Script
    ↑ injects values into DOM (property setter interception for React/Vue)
```

### Key Directories

**Client**
- `client/src/shared/` — No-UI utilities: constants, AES-GCM crypto, storage wrappers, request queue, consent gate
- `client/src/adapters/` — One file per AI provider (`claude.js`, `openai.js`, `gemini.js`, `local.js`) plus `index.js` (AdapterRegistry)
- `client/src/worker/` — Service worker: message dispatcher, keepalive, proxy client, context builder, field router, error handler
- `client/src/content/` — Content script: field scanner, field injector, self-contained IIFE
- `client/src/sidebar/` — React side panel with 4 tabs (Chat, Profile, Settings, Audit)
  - `components/` — Top-level panels: `ChatPanel.jsx`, `ProfilePanel.jsx`, `SettingsPanel.jsx`, `AuditPanel.jsx`, `PromptPreview.jsx`, `CostBadge.jsx`
  - `components/sections/` — 11 profile section components + `profileFieldConfigs.js` + `SectionCustomFieldsAddon.jsx`
  - `components/audit/` — `TokenUsageTab.jsx`, `ConsentLogTab.jsx`, `PrivacySection.jsx`, `auditUtils.js`
  - `components/settings/` — `AiProviderSection.jsx`, `FeaturesSection.jsx`, `ProfileSectionsSection.jsx`, `ProxySection.jsx`
  - `hooks/` — `useFeatureFlags.js` (merges hardcoded → remote → local overrides)
- `client/src/options/` — Full-page options UI (reuses sidebar panels)

**Server**
- `server/index.js` — Express app entry point
- `server/config.js` — Env config, feature flag parser, API key loader
- `server/routes/` — `health.js`, `complete.js`, `extract.js`, `flags.js`
- `server/lib/` — `mock.js`, `requestBuilder.js`, `streaming.js`, `utils.js`

**Shared**
- `shared/contract.js` — `PROVIDERS`, `ENDPOINTS`, `SSE` sentinels used by both client and server

### Server Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health/status check |
| POST | `/v1/complete` | Streaming text completion (SSE) — proxies to Claude/OpenAI/Gemini |
| POST | `/v1/extract` | PDF/DOCX → JSON field extraction (pdf-parse + mammoth); body limit 10 MB |
| GET | `/v1/flags` | Feature flag object (operator-controlled remote flags) |

### Storage Keys

**`chrome.storage.session`** — No rate limit; cleared on browser restart.

| Key | Contents |
|-----|----------|
| `ai_ext:request_queue` | Serial FIFO request queue |
| `ai_ext:chat:<domain>` | Staged chat history per domain |
| `ai_ext:fields:<domain>` | Field map per domain |
| `ai_ext:session_key` | AES-GCM session key (JWK format) |

**`chrome.storage.local`** — 120 writes/min limit; writes coalesced in `client/src/shared/storage.js`.

| Key | Contents |
|-----|----------|
| `ai_ext:settings` | Provider, model, apiKey, features, proxyUrl |
| `ai_ext:profile:<id>` | Profile template data |
| `ai_ext:templates` | List of template IDs |
| `ai_ext:token_log` | Token usage history |
| `ai_ext:consent_log` | Consent event log (max 200 entries) |
| `ai_ext:audit_last_viewed` | Timestamp for audit unread badge |

### Concurrency

`client/src/shared/requestQueue.js` enforces a serial FIFO queue stored in session storage. All AI requests must go through it to prevent interleaved SSE streams.

### Feature Flag Merging

Feature flags flow through three layers (later layers win):
1. **Hardcoded defaults** in `DEFAULT_SETTINGS.features` (`client/src/shared/constants.js`)
2. **Remote flags** fetched from proxy `GET /v1/flags` — operator control
3. **Local overrides** saved via Settings panel — user control

`client/src/sidebar/hooks/useFeatureFlags.js` performs the merge at runtime.

**Available flags:**
- `costBadge` — show per-call cost badge
- `auditPanel` — show Audit tab
- `attachmentFilling` — include uploaded document text in AI context
- `documentsSection`, `personalSection`, `employmentSection`, `educationSection`, `judgingSection`, `mentoringSection`, `speakerSection`, `scholarshipSection`, `professionalAccountsSection`, `customFieldsSection` — show/hide each profile section

### Profile Sections

ProfilePanel renders up to 11 sections, each gated by a feature flag:

| Section | Component | Key Fields |
|---------|-----------|------------|
| Personal Info | `PersonalInfoSection.jsx` | firstName, lastName, pronouns, email, phone, address, city, state, zip, country, bio, password |
| Employment | `EmployeeInfoSection.jsx` | jobTitle, company, yearsExperience, LinkedIn, portfolio, skills, coverLetter |
| Education | `EducationInfoSection.jsx` | degree, fieldOfStudy, school, graduationYear, gpa |
| Judging | `JudgingSection.jsx` | role, organization, domain, year, website, notes |
| Mentoring | `MentoringSection.jsx` | role, organization, focus, availability, website, bio |
| Speaker | `SpeakerSection.jsx` | topics, events, bio, honorarium, website, video |
| Scholarship | `ScholarshipSection.jsx` | name, org, school, level, gpa, statement, financialNeed, extracurriculars, references |
| Professional Accounts | `ProfessionalAccountsSection.jsx` | LinkedIn, Twitter/X, GitHub, Instagram, YouTube, Portfolio URLs |
| Documents | `DocumentsSection.jsx` | PDF/DOCX uploads → base64 for AI context |
| Custom Fields | `CustomFieldsSection.jsx` | User-defined label → key pairs (global scope) |

Every section also accepts section-scoped custom fields via `SectionCustomFieldsAddon.jsx`. Custom field keys are namespaced `<sectionId>__<customKey>` (e.g., `employment__certifications`).

Field definitions for all built-in sections live in `profileFieldConfigs.js` — edit there to add/remove fields from a section without touching the section component.

### Adding a New AI Provider

1. Create `client/src/adapters/myprovider.js` exporting `normalise(payload)` and `parseUsage(response)`
2. Import and register in `client/src/adapters/index.js`
3. Add models and cost entries to `MODELS` and `COST_TABLE` in `client/src/shared/constants.js` (UI-only — the proxy switches on provider, not model)
4. The service worker and proxy require no changes

### Adding a New Profile Section

1. Create `client/src/sidebar/components/sections/MySection.jsx` — follow the pattern of any existing section component
2. Add field definitions to `profileFieldConfigs.js` (export `MY_SECTION_FIELDS`)
3. Add a feature flag default (`mySection: true`) to `DEFAULT_SETTINGS.features` in `constants.js`
4. Add the flag to `ProfileSectionsSection.jsx` (settings toggle)
5. Import and render the section in `ProfilePanel.jsx`, gated by `features.mySection`
6. Add the flag key to the server's `FEATURE_FLAGS` in `server/config.js`

### Service Worker Keepalive

MV3 service workers suspend after ~30s of inactivity. The sidebar holds a long-lived port and pings every 20s (`MSG.PING`) via `client/src/worker/keepalive.js` to keep the SW alive during streaming.

### Content Script Safety

`client/src/content/content.js` guards against double-injection with `window.__aiFormAssistantLoaded`. Field values are injected by intercepting property setters so frameworks like React and Vue pick up the changes; synthetic `input` and `change` events are dispatched afterward.

### Field Routing

`client/src/worker/fieldRouter.js` buckets detected fields into three categories:
- **Static** — high confidence match in saved profile → filled directly without AI
- **Smart** — medium confidence → sent to AI for generation
- **Preview** — low confidence → shown in `PromptPreview.jsx` for user confirmation before submission

`PromptPreview.jsx` also lets users override field mapping: choose "Let AI decide" or map an extracted field to a specific profile field key.

### Error Shape

All errors are normalized to `{ code, message, retryable, provider, timestamp }` in `client/src/worker/errorHandler.js`. Use `getRetryDelay(code)` for appropriate backoff.

### Document Extraction

`POST /v1/extract` accepts a base64-encoded PDF or DOCX file (no `.doc` support). The server uses `pdf-parse` (PDF) and `mammoth` (DOCX) to extract text, then returns a JSON object with up to 23 profile fields. ProfilePanel shows a review modal with before/after diff; the user selects which extracted fields to apply. Raw document text is also embedded in the AI prompt when the `attachmentFilling` flag is enabled.

### Proxy MOCK Mode

`npm run proxy:mock` (from the repo root) returns fake SSE responses without hitting any upstream API. Use this during UI or content script development to avoid needing API keys.

### Message Types (MSG constants)

`PING`, `PONG`, `FILL_FORM`, `CHAT_MESSAGE`, `CLASSIFY_FIELDS`, `SAVE_FIELD`, `GET_PROFILE`, `UPDATE_SETTINGS`, `TEST_CONNECTION`, `GET_TOKEN_USAGE`, `CLEAR_DATA`, `EXTRACT_FROM_DOCUMENT`

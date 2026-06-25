import { PROVIDERS as CONTRACT_PROVIDERS, ENDPOINTS, SSE } from '@aifa/contract';

// ─── Message types ────────────────────────────────────────────────────────────

export const MSG = {
  PING:                   'PING',
  PONG:                   'PONG',
  FILL_FORM:              'FILL_FORM',
  CHAT_MESSAGE:           'CHAT_MESSAGE',
  CLASSIFY_FIELDS:        'CLASSIFY_FIELDS',
  SAVE_FIELD:             'SAVE_FIELD',
  GET_PROFILE:            'GET_PROFILE',
  UPDATE_SETTINGS:        'UPDATE_SETTINGS',
  TEST_CONNECTION:        'TEST_CONNECTION',
  GET_TOKEN_USAGE:        'GET_TOKEN_USAGE',
  CLEAR_DATA:             'CLEAR_DATA',
  EXTRACT_FROM_DOCUMENT:  'EXTRACT_FROM_DOCUMENT',
};

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ERR = {
  AUTH_FAILED:          'AUTH_FAILED',
  RATE_LIMIT:           'RATE_LIMIT',
  TIMEOUT:              'TIMEOUT',
  PROXY_UNREACHABLE:    'PROXY_UNREACHABLE',
  MALFORMED_RESPONSE:   'MALFORMED_RESPONSE',
  STORAGE_ERROR:        'STORAGE_ERROR',
  STREAM_INTERRUPTED:   'STREAM_INTERRUPTED',
  CONTENT_SCRIPT_ERROR: 'CONTENT_SCRIPT_ERROR',
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS:      'ai_ext:settings',
  PROFILE:       'ai_ext:profile:',   // append templateId
  TEMPLATES:     'ai_ext:templates',
  TOKEN_LOG:     'ai_ext:token_log',
  CHAT_HISTORY:  'ai_ext:chat:',      // append domain
  FIELD_MAP:     'ai_ext:fields:',    // append domain
  SESSION_KEY:   'ai_ext:session_key',
  REQUEST_QUEUE: 'ai_ext:request_queue',
  CONSENT_LOG:   'ai_ext:consent_log',
};

// ─── Confidence thresholds ────────────────────────────────────────────────────

export const CONFIDENCE = {
  THRESHOLD: 0.6, // fields below this go to preview bucket
};

// ─── Providers ────────────────────────────────────────────────────────────────

export const PROVIDERS = CONTRACT_PROVIDERS;

// ─── Models per provider ──────────────────────────────────────────────────────

export const MODELS = {
  claude: [
    { id: 'claude-sonnet-4-6',           label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-8',             label: 'Claude Opus 4.8' },
    { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro-latest',   label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
  ],
  local: [
    { id: 'llama3',   label: 'Llama 3' },
    { id: 'mistral',  label: 'Mistral' },
    { id: 'phi3',     label: 'Phi-3' },
  ],
};

// ─── Cost table — USD per 1 000 tokens ───────────────────────────────────────

const COST_TABLE = {
  'claude-sonnet-4-6':          { input: 0.003,    output: 0.015    },
  'claude-opus-4-8':            { input: 0.015,    output: 0.075    },
  'claude-haiku-4-5-20251001':  { input: 0.00025,  output: 0.00125  },
  'gpt-4o':                     { input: 0.005,    output: 0.015    },
  'gpt-4o-mini':                { input: 0.000150, output: 0.000600 },
  'gpt-4-turbo':                { input: 0.010,    output: 0.030    },
  'gemini-1.5-pro-latest':      { input: 0.00125,  output: 0.005    },
  'gemini-1.5-flash-latest':    { input: 0.000075, output: 0.0003   },
};

export function estimateCost(model, inputTokens = 0, outputTokens = 0) {
  const rates = COST_TABLE[model] ?? { input: 0, output: 0 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// ─── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE_ID = 'default';

export const DEFAULT_SETTINGS = {
  provider:           'claude',
  model:              'claude-sonnet-4-6',
  proxyUrl:           'http://localhost:3000',
  localLlmHost:       'localhost',
  localLlmPort:       11434,
  apiKeyCiphertext:   null,
  apiKeyIv:           null,
  costDisplayEnabled: true, // deprecated — migrated to features.costDisplay on first read
  features: {
    documentExtraction: true,
    auditLog:           true,
    costDisplay:        true,
  },
};

// ─── Proxy ────────────────────────────────────────────────────────────────────

export const PROXY_ENDPOINT   = ENDPOINTS.COMPLETE;
export const EXTRACT_ENDPOINT = ENDPOINTS.EXTRACT;

// ─── SSE sentinels ────────────────────────────────────────────────────────────

export const SSE_DONE  = SSE.DONE;
export const SSE_USAGE = SSE.USAGE;
export const SSE_ERROR = SSE.ERROR;

// ─── Keepalive ────────────────────────────────────────────────────────────────

export const KEEPALIVE_PORT_NAME   = 'ai-form-assistant-keepalive';
export const KEEPALIVE_INTERVAL_MS = 20_000;

// @aifa/contract — the wire contract shared by the extension (client) and the
// proxy (server). Edit these once; both halves import from here so they can
// never drift out of sync.

// AI provider identifiers.
export const PROVIDERS = {
  CLAUDE: 'claude',
  OPENAI: 'openai',
  GEMINI: 'gemini',
  LOCAL:  'local',
};

// Proxy HTTP endpoints.
export const ENDPOINTS = {
  COMPLETE: '/v1/complete',
  EXTRACT:  '/v1/extract',
  FLAGS:    '/v1/flags',
};

// SSE sentinels used on the streaming channel between server and client.
export const SSE = {
  DONE:  '[DONE]',
  USAGE: '__usage__',
  ERROR: '__error__',
};

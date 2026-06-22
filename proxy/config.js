import 'dotenv/config';

export const PORT             = process.env.PORT             ?? 3000;
export const MOCK             = process.env.MOCK             === 'true';
export const CORS_ORIGIN      = process.env.CORS_ORIGIN      ?? '*';
export const MAX_TOKENS       = parseInt(process.env.CLAUDE_MAX_TOKENS ?? '1024', 10);
export const ANTHROPIC_VER    = process.env.ANTHROPIC_VERSION ?? '2023-06-01';
export const LOCAL_LLM_HOST   = process.env.LOCAL_LLM_HOST   ?? 'localhost';
export const LOCAL_LLM_PORT   = parseInt(process.env.LOCAL_LLM_PORT   ?? '11434', 10);
export const MOCK_INTERVAL_MS = parseInt(process.env.MOCK_INTERVAL_MS ?? '80',    10);

export const ENV_KEYS = {
  claude: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

const parseBool = (val, def) => val === undefined ? def : val !== 'false';
export const FEATURE_FLAGS = {
  documentExtraction: parseBool(process.env.FEATURE_DOCUMENT_EXTRACTION, false),
  auditLog:           parseBool(process.env.FEATURE_AUDIT_LOG,           false),
  costDisplay:        parseBool(process.env.FEATURE_COST_DISPLAY,        false),
};

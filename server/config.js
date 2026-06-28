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
  documentsSection:    parseBool(process.env.FEATURE_DOCUMENTS_SECTION,       false),
  auditPanel:          parseBool(process.env.FEATURE_AUDIT_PANEL,             false),
  costBadge:           parseBool(process.env.FEATURE_COST_BADGE,              false),
  attachmentFilling:   parseBool(process.env.FEATURE_ATTACHMENT_FILLING,      false),
  personalSection:     parseBool(process.env.FEATURE_PERSONAL_SECTION,        false),
  employmentSection:   parseBool(process.env.FEATURE_EMPLOYMENT_SECTION,      false),
  educationSection:    parseBool(process.env.FEATURE_EDUCATION_SECTION,       false),
  customFieldsSection: parseBool(process.env.FEATURE_CUSTOM_FIELDS_SECTION,   false),
  judgingSection:      parseBool(process.env.FEATURE_JUDGING_SECTION,          false),
  mentoringSection:    parseBool(process.env.FEATURE_MENTORING_SECTION,        false),
  speakerSection:      parseBool(process.env.FEATURE_SPEAKER_SECTION,          false),
  scholarshipSection:           parseBool(process.env.FEATURE_SCHOLARSHIP_SECTION,            false),
  professionalAccountsSection:  parseBool(process.env.FEATURE_PROFESSIONAL_ACCOUNTS_SECTION,  false),
};

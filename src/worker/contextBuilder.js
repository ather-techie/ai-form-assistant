/**
 * contextBuilder.js — Assembles the prompt sent to the AI.
 * Combines field schema, saved profile data, chat history, and page metadata.
 */

import { getProfile, getChatHistory } from '../shared/storage.js';

/**
 * Builds the messages array for the AI call.
 *
 * @param {object} opts
 * @param {Array}  opts.fields      - From fieldScanner: [{ id, label, type, classification, confidence }]
 * @param {string} opts.domain      - Current page domain
 * @param {string} opts.pageTitle   - Current page <title>
 * @param {string} opts.templateId  - Profile template to load
 * @param {string} [opts.userNote]  - Optional free-text hint from the user
 * @returns {Promise<{ messages: Array, schema: object }>}
 */
export async function buildContext({ fields, domain, pageTitle, templateId, userNote }) {
  const profile  = await getProfile(templateId);
  const history  = await getChatHistory(domain);

  // Build JSON schema from fields (for structured output)
  const schema = {};
  for (const f of fields) {
    schema[f.id] = {
      type:        'string',
      description: `${f.label} (${f.classification})`,
    };
  }

  // System prompt
  const systemContent = [
    `You are an AI form-filling assistant. Fill in the form fields on "${pageTitle}" (${domain}).`,
    `Return ONLY a JSON object where each key is a field id and each value is the best answer.`,
    profile && Object.keys(profile.fields).length
      ? `Known user profile data: ${JSON.stringify(profile.fields)}`
      : '',
    userNote ? `User note: ${userNote}` : '',
  ].filter(Boolean).join('\n');

  // Field list prompt
  const fieldList = fields.map(f =>
    `- id="${f.id}" label="${f.label}" type="${f.type}" confidence=${f.confidence}${f.confidence < 0.6 ? ' ⚠ uncertain' : ''}`
  ).join('\n');

  const userContent = `Please fill these form fields:\n${fieldList}`;

  // Compose messages: truncated history + single user turn combining context + request.
  // Merging into one message avoids consecutive user-role messages, which Claude's API rejects (400).
  const messages = [
    ...history.slice(-10),
    { role: 'user', content: `${systemContent}\n\n${userContent}` },
  ];

  return { messages, schema };
}

/**
 * Builds a lightweight classification-only prompt for low-confidence field batches.
 * Used by CLASSIFY_FIELDS message type.
 */
export function buildClassifyContext(fields) {
  const fieldList = fields.map(f =>
    `id="${f.id}" label="${f.label}" placeholder="${f.placeholder ?? ''}" name="${f.name ?? ''}"`
  ).join('\n');

  return [{
    role:    'user',
    content: `Categorise each form field as one of: name, email, phone, address, date, number, text, or unknown.\nReturn ONLY JSON: { "fieldId": "category", ... }\n\nFields:\n${fieldList}`,
  }];
}

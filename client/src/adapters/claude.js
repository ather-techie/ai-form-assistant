/**
 * Claude adapter — Anthropic Messages API.
 * Uses tool-calling to enforce JSON output shape.
 */

export default { normalise, parseUsage };

function normalise(messages, schema, settings) {
  const tools = schema ? [{
    name:         'form_fill',
    description:  'Fill form fields with appropriate values.',
    input_schema: { type: 'object', properties: schema, required: Object.keys(schema) },
  }] : undefined;

  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      settings.model,
      max_tokens: 1024,
      stream:     true,
      messages:   messages.map(toClaudeMsg),
      ...(tools ? { tools, tool_choice: { type: 'tool', name: 'form_fill' } } : {}),
    }),
  };
}

function parseUsage(data) {
  return {
    inputTokens:  data?.usage?.input_tokens  ?? 0,
    outputTokens: data?.usage?.output_tokens ?? 0,
  };
}

function toClaudeMsg({ role, content }) {
  return { role, content };
}

/**
 * OpenAI adapter — Chat Completions API with json_schema response format.
 */

export default { normalise, parseUsage };

function normalise(messages, schema, settings) {
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model:  settings.model,
      stream: true,
      messages: messages.map(toOpenAIMsg),
      ...(schema ? {
        response_format: {
          type:        'json_schema',
          json_schema: {
            name:   'form_fill',
            strict: true,
            schema: { type: 'object', properties: schema, required: Object.keys(schema) },
          },
        },
      } : {}),
    }),
  };
}

function parseUsage(data) {
  return {
    inputTokens:  data?.usage?.prompt_tokens     ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
  };
}

function toOpenAIMsg({ role, content }) {
  return { role, content };
}

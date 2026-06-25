import { MAX_TOKENS, ANTHROPIC_VER, LOCAL_LLM_HOST, LOCAL_LLM_PORT } from '../config.js';

export function buildUpstreamRequest(provider, model, messages, schema, apiKey, localOverrides = {}) {
  switch (provider) {
    case 'claude':
      return {
        url:     'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': ANTHROPIC_VER,
        },
        body: JSON.stringify({
          model, stream: true, max_tokens: MAX_TOKENS,
          messages,
          ...(schema ? {
            tools: [{ name: 'form_fill', description: 'Fill form fields.', input_schema: { type: 'object', properties: schema, required: Object.keys(schema) } }],
            tool_choice: { type: 'tool', name: 'form_fill' },
          } : {}),
        }),
      };

    case 'openai':
      return {
        url:     'https://api.openai.com/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, stream: true, messages,
          ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: 'form_fill', strict: true, schema: { type: 'object', properties: schema, required: Object.keys(schema) } } } } : {}),
        }),
      };

    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
      return {
        url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: schema ? { responseMimeType: 'application/json' } : {},
        }),
      };
    }

    case 'local': {
      const host = localOverrides.localLlmHost ?? LOCAL_LLM_HOST;
      const port = localOverrides.localLlmPort ?? LOCAL_LLM_PORT;
      return {
        url:     `http://${host}:${port}/v1/chat/completions`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: true, messages }),
      };
    }

    default:
      throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 });
  }
}

export function buildNonStreamingRequest(provider, model, messages, apiKey) {
  switch (provider) {
    case 'claude':
      return {
        url:     'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': ANTHROPIC_VER,
        },
        body: JSON.stringify({ model, stream: false, max_tokens: MAX_TOKENS, messages }),
      };

    case 'openai':
      return {
        url:     'https://api.openai.com/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, stream: false, messages }),
      };

    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      return {
        url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        }),
      };
    }

    case 'local':
      return {
        url:     `http://${LOCAL_LLM_HOST}:${LOCAL_LLM_PORT}/v1/chat/completions`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: false, messages }),
      };

    default:
      throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 });
  }
}

export function extractNonStreamingText(data, provider) {
  if (provider === 'claude')  return data?.content?.[0]?.text ?? '';
  if (provider === 'openai' || provider === 'local') return data?.choices?.[0]?.message?.content ?? '';
  if (provider === 'gemini')  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return '';
}

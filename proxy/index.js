/**
 * proxy/index.js — Local Express proxy.
 * REST contract: POST /v1/complete → SSE stream.
 * Supports MOCK=true for development without API keys.
 * GET /health — connection test endpoint.
 */

import 'dotenv/config';
import express from 'express';
import cors    from 'cors';

const app  = express();
const PORT             = process.env.PORT             ?? 3000;
const MOCK             = process.env.MOCK             === 'true';
const CORS_ORIGIN      = process.env.CORS_ORIGIN      ?? '*';
const MAX_TOKENS       = parseInt(process.env.CLAUDE_MAX_TOKENS ?? '1024', 10);
const ANTHROPIC_VER    = process.env.ANTHROPIC_VERSION ?? '2023-06-01';
const LOCAL_LLM_HOST   = process.env.LOCAL_LLM_HOST   ?? 'localhost';
const LOCAL_LLM_PORT   = parseInt(process.env.LOCAL_LLM_PORT   ?? '11434', 10);
const MOCK_INTERVAL_MS = parseInt(process.env.MOCK_INTERVAL_MS ?? '80',    10);

const ENV_KEYS = {
  claude: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, mock: MOCK, timestamp: Date.now() });
});

// ─── POST /v1/complete ────────────────────────────────────────────────────────

app.post('/v1/complete', async (req, res) => {
  const { provider, model, messages, schema, stream = true, apiKey: bodyKey } = req.body;
  const apiKey = bodyKey || ENV_KEYS[provider] || null;

  // Validate required fields
  if (!provider || !messages) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'provider and messages are required.' });
  }

  // Set SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (MOCK) {
    return serveMock(res, model, provider);
  }

  if (!apiKey && provider !== 'local') {
    return sendSseError(res, { status: 401, message: 'No API key provided. Set one in the extension Settings or in proxy/.env.' });
  }

  try {
    const { url, headers, body } = buildUpstreamRequest(provider, model, messages, schema, apiKey);
    await pipeUpstream(url, headers, body, provider, model, res);
  } catch (err) {
    sendSseError(res, err);
  }
});

// ─── Upstream request builder ─────────────────────────────────────────────────

function buildUpstreamRequest(provider, model, messages, schema, apiKey) {
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
      const host = req?.body?.localLlmHost ?? LOCAL_LLM_HOST;
      const port = req?.body?.localLlmPort ?? LOCAL_LLM_PORT;
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

// ─── Pipe upstream SSE to client ──────────────────────────────────────────────

async function pipeUpstream(url, headers, body, provider, model, res) {
  let upstreamRes;
  try {
    upstreamRes = await fetch(url, { method: 'POST', headers, body });
  } catch (err) {
    throw { status: 502, message: 'Could not reach upstream provider.' };
  }

  if (!upstreamRes.ok) {
    const code = upstreamRes.status;
    if (code === 401 || code === 403) throw { status: code, message: 'API key rejected by provider.' };
    if (code === 429) { res.setHeader('Retry-After', upstreamRes.headers.get('Retry-After') ?? '5'); throw { status: 429, message: 'Rate limited by provider.' }; }
    throw { status: 502, message: `Provider returned ${code}.` };
  }

  const reader  = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  let   buf     = '';
  let   usage   = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith(':')) continue;
      if (!t.startsWith('data:')) continue;

      const data = t.slice(5).trim();
      if (data === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }

      const parsed = safeJson(data);
      if (!parsed) continue;

      // Extract token text (provider-specific)
      const text = extractText(parsed, provider);
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);

      // Capture usage
      const u = extractUsage(parsed, provider);
      if (u) usage = u;
    }
  }

  // Emit usage trailer
  if (usage) {
    res.write(`data: __usage__:${JSON.stringify({ ...usage, model, provider })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

// ─── Provider-specific text extraction ───────────────────────────────────────

function extractText(parsed, provider) {
  if (provider === 'claude') {
    if (parsed?.type === 'content_block_delta') return parsed?.delta?.text ?? null;
    if (parsed?.type === 'input_json_delta')    return parsed?.delta?.partial_json ?? null;
    return null;
  }
  if (provider === 'openai' || provider === 'local') {
    return parsed?.choices?.[0]?.delta?.content ?? null;
  }
  if (provider === 'gemini') {
    return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
  return null;
}

function extractUsage(parsed, provider) {
  if (provider === 'claude')  return parsed?.usage ? { inputTokens: parsed.usage.input_tokens, outputTokens: parsed.usage.output_tokens } : null;
  if (provider === 'openai' || provider === 'local') return parsed?.usage ? { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens } : null;
  if (provider === 'gemini')  return parsed?.usageMetadata ? { inputTokens: parsed.usageMetadata.promptTokenCount, outputTokens: parsed.usageMetadata.candidatesTokenCount } : null;
  return null;
}

// ─── MOCK mode ────────────────────────────────────────────────────────────────

function serveMock(res, model, provider) {
  const tokens = ['This ', 'is ', 'a ', 'mock ', 'AI ', 'response ', 'for ', 'testing.'];
  let   i      = 0;

  const iv = setInterval(() => {
    if (i < tokens.length) {
      res.write(`data: ${JSON.stringify({ text: tokens[i++] })}\n\n`);
    } else {
      clearInterval(iv);
      res.write(`data: __usage__:${JSON.stringify({ inputTokens: 42, outputTokens: 18, model, provider })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }, MOCK_INTERVAL_MS);

  res.on('close', () => clearInterval(iv));
}

// ─── Error SSE ────────────────────────────────────────────────────────────────

function sendSseError(res, err) {
  const code    = err.status ?? 500;
  const message = err.message ?? 'Internal proxy error.';
  res.write(`data: __error__:${JSON.stringify({ code, message })}\n\n`);
  res.end();
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const configured = ['claude', 'openai', 'gemini'].filter(p => ENV_KEYS[p]).join(', ') || 'none';
  console.log(`AI Form Assistant proxy running on http://localhost:${PORT} ${MOCK ? '[MOCK MODE] ' : ''}— env keys: ${configured}`);
});

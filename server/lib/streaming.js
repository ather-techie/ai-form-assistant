import { safeJson } from './utils.js';
import { SSE } from '@aifa/contract';

export async function pipeUpstream(url, headers, body, provider, model, res) {
  let upstreamRes;
  try {
    upstreamRes = await fetch(url, { method: 'POST', headers, body });
  } catch {
    throw { status: 502, message: 'Could not reach upstream provider.' };
  }

  if (!upstreamRes.ok) {
    const code = upstreamRes.status;
    if (code === 401 || code === 403) throw { status: code, message: 'API key rejected by provider.' };
    if (code === 429) {
      res.setHeader('Retry-After', upstreamRes.headers.get('Retry-After') ?? '5');
      throw { status: 429, message: 'Rate limited by provider.' };
    }
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
      if (data === SSE.DONE) { res.write(`data: ${SSE.DONE}\n\n`); continue; }

      const parsed = safeJson(data);
      if (!parsed) continue;

      const text = extractText(parsed, provider);
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);

      const u = extractUsage(parsed, provider);
      if (u) usage = u;
    }
  }

  if (usage) {
    res.write(`data: ${SSE.USAGE}:${JSON.stringify({ ...usage, model, provider })}\n\n`);
  }
  res.write(`data: ${SSE.DONE}\n\n`);
  res.end();
}

export function extractText(parsed, provider) {
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

export function extractUsage(parsed, provider) {
  if (provider === 'claude')  return parsed?.usage ? { inputTokens: parsed.usage.input_tokens, outputTokens: parsed.usage.output_tokens } : null;
  if (provider === 'openai' || provider === 'local') return parsed?.usage ? { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens } : null;
  if (provider === 'gemini')  return parsed?.usageMetadata ? { inputTokens: parsed.usageMetadata.promptTokenCount, outputTokens: parsed.usageMetadata.candidatesTokenCount } : null;
  return null;
}

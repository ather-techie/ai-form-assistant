/**
 * Local LLM adapter — OpenAI-compatible endpoint (Ollama / LM Studio).
 * Port and host are user-configurable in Settings (default: localhost:11434).
 */

export default { normalise, parseUsage };

function normalise(messages, schema, settings) {
  const host = settings.localLlmHost ?? 'localhost';
  const port = settings.localLlmPort ?? 11434;
  const url  = `http://${host}:${port}/v1/chat/completions`;

  const systemPrompt = schema
    ? `You are a form-filling assistant. Respond ONLY with valid JSON matching this schema: ${JSON.stringify(schema)}. No explanation, no markdown.`
    : 'You are a helpful assistant.';

  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:  settings.model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  };
}

function parseUsage(data) {
  return {
    inputTokens:  data?.usage?.prompt_tokens     ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
  };
}

/**
 * Gemini adapter — Google Generative Language API (streaming).
 */

export default { normalise, parseUsage };

function normalise(messages, schema, settings) {
  const model = settings.model;
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${settings.apiKey}&alt=sse`;

  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map(toGeminiContent),
      generationConfig: {
        ...(schema ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  };
}

function parseUsage(data) {
  const meta = data?.usageMetadata ?? {};
  return {
    inputTokens:  meta.promptTokenCount     ?? 0,
    outputTokens: meta.candidatesTokenCount ?? 0,
  };
}

function toGeminiContent({ role, content }) {
  // Gemini uses 'user' and 'model' roles
  return {
    role:  role === 'assistant' ? 'model' : 'user',
    parts: [{ text: content }],
  };
}

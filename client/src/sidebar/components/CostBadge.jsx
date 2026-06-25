import { useState } from 'react';
import { estimateCost } from '../../shared/constants.js';

/**
 * CostBadge — shows token count and estimated cost after each AI call.
 * Tooltip shows session cumulative (tracked in component state).
 */
export default function CostBadge({ usage }) {
  const [sessionTokens, setSessionTokens] = useState({ in: 0, out: 0 });

  if (!usage) return null;

  const { inputTokens = 0, outputTokens = 0, model = '' } = usage;
  const cost = estimateCost(model, inputTokens, outputTokens);
  const total = estimateCost(model, sessionTokens.in + inputTokens, sessionTokens.out + outputTokens);

  // Accumulate session totals
  if (inputTokens && (inputTokens !== sessionTokens._lastIn)) {
    setSessionTokens(prev => ({ in: prev.in + inputTokens, out: prev.out + outputTokens, _lastIn: inputTokens }));
  }

  return (
    <span
      className="context-strip__badge"
      title={`Session total: ~$${total.toFixed(6)}\nIn: ${sessionTokens.in + inputTokens} tokens\nOut: ${sessionTokens.out + outputTokens} tokens`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, cursor: 'default' }}
    >
      {inputTokens + outputTokens} tok · ${cost.toFixed(5)}
    </span>
  );
}

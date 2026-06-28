import { fmt } from './auditUtils.js';

export default function TokenUsageTab({ tokenLog }) {
  const totalCost = tokenLog.reduce((sum, e) => sum + (e.estimatedCost ?? 0), 0);
  const totalIn   = tokenLog.reduce((sum, e) => sum + (e.inputTokens ?? 0), 0);
  const totalOut  = tokenLog.reduce((sum, e) => sum + (e.outputTokens ?? 0), 0);

  return (
    <>
      <div className="card" style={{ marginBottom: 12, padding: '10px 14px' }}>
        <div className="row row--between">
          <span className="text-muted text-small">Total input</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{totalIn.toLocaleString()} tok</span>
        </div>
        <div className="row row--between">
          <span className="text-muted text-small">Total output</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{totalOut.toLocaleString()} tok</span>
        </div>
        <div className="row row--between" style={{ marginTop: 6 }}>
          <span className="text-muted text-small">Estimated cost</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>${totalCost.toFixed(5)}</span>
        </div>
      </div>

      {tokenLog.length === 0 && (
        <p className="text-muted text-small">No token usage recorded yet.</p>
      )}

      {tokenLog.map((entry, i) => (
        <div key={i} className="card" style={{ padding: '8px 12px', marginBottom: 6 }}>
          <div className="row row--between">
            <span style={{ fontSize: 12, fontWeight: 600 }}>{entry.model ?? '—'}</span>
            <span className="text-muted text-small">${(entry.estimatedCost ?? 0).toFixed(5)}</span>
          </div>
          <div className="row row--between">
            <span className="text-muted text-small">
              {(entry.inputTokens ?? 0)}↑ {(entry.outputTokens ?? 0)}↓
            </span>
            <span className="text-muted text-small">{fmt(entry.timestamp)}</span>
          </div>
        </div>
      ))}
    </>
  );
}

import { fmt, mask } from './auditUtils.js';

export default function ConsentLogTab({ consentLog }) {
  return (
    <>
      {consentLog.length === 0 && (
        <p className="text-muted text-small">No consent events recorded yet.</p>
      )}

      {consentLog.map((entry, i) => (
        <div key={i} className="card" style={{ padding: '8px 12px', marginBottom: 6 }}>
          <div className="row row--between">
            <span style={{ fontSize: 12, fontWeight: 600 }}>{entry.field ?? '—'}</span>
            <span className="text-muted text-small">{entry.source ?? '—'}</span>
          </div>
          <div className="row row--between">
            <span className="text-muted text-small">{mask(entry.value)}</span>
            <span className="text-muted text-small">{entry.domain ?? '—'}</span>
          </div>
          <span className="text-muted text-small" style={{ fontSize: 10 }}>{fmt(entry.timestamp)}</span>
        </div>
      ))}
    </>
  );
}

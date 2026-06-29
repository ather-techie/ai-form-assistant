import { useState } from 'react';
import { fmt } from './auditUtils.js';
import { MSG } from '../../../shared/constants.js';

// ── Colour-coded event badges ─────────────────────────────────────────────────

const BADGE_COLOR = {
  fill_start:        '#3b82f6',
  fields_scanned:    '#6366f1',
  routing_complete:  '#8b5cf6',
  ai_call:           '#06b6d4',
  ai_response:       '#06b6d4',
  injection_result:  '#22c55e',
  fill_error:        '#ef4444',
};

function badgeStyle(type) {
  const bg = BADGE_COLOR[type] ?? '#64748b';
  return {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
    background: bg,
    color: '#fff',
    letterSpacing: '0.03em',
    flexShrink: 0,
  };
}

// ── Per-event detail renderers ────────────────────────────────────────────────

function EventDetail({ type, data }) {
  if (type === 'fill_start') {
    return (
      <span className="text-muted text-small">
        {data.domain} — {data.fieldCount} field{data.fieldCount !== 1 ? 's' : ''} on page
      </span>
    );
  }

  if (type === 'fields_scanned') {
    const fields = data.fields ?? [];
    return (
      <div className="text-muted text-small">
        {fields.map(f => (
          <span key={f.id} style={{ marginRight: 6 }}>
            {f.id} <span style={{ opacity: 0.6 }}>({f.classification}, {f.confidence.toFixed(1)})</span>
          </span>
        ))}
      </div>
    );
  }

  if (type === 'routing_complete') {
    const details = data.matchDetails ?? [];
    const staticCount  = details.filter(d => d.bucket === 'static').length;
    const smartCount   = details.filter(d => d.bucket === 'smart').length;
    const previewCount = details.filter(d => d.bucket === 'preview').length;
    return (
      <div>
        <div className="text-muted text-small" style={{ marginBottom: 4 }}>
          ✓ {staticCount} static &nbsp;·&nbsp; ~ {smartCount} AI &nbsp;·&nbsp; ? {previewCount} preview
        </div>
        {details.map((d, i) => {
          const isUnmatched = d.bucket !== 'static';
          return (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, color: isUnmatched ? '#f59e0b' : 'var(--text-muted)' }}>
              <span style={{ fontSize: 11 }}>
                {d.bucket === 'static' ? '✓' : d.bucket === 'preview' ? '?' : '~'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{d.fieldId}</span>
              {d.bucket === 'static' && (
                <span style={{ fontSize: 11 }}>→ <code style={{ fontSize: 10 }}>{d.profileKey}</code> ({d.matchType})</span>
              )}
              {d.bucket !== 'static' && (
                <span style={{ fontSize: 11, color: d.bucket === 'preview' ? '#f59e0b' : '#94a3b8' }}>
                  {d.reason} ({d.classification}, {(d.confidence ?? 0).toFixed(1)})
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'ai_call') {
    return (
      <span className="text-muted text-small">
        {data.fieldCount} field{data.fieldCount !== 1 ? 's' : ''} → AI: {(data.fieldIds ?? []).join(', ')}
      </span>
    );
  }

  if (type === 'injection_result') {
    const ok = (data.failed ?? 0) === 0;
    return (
      <span className="text-small" style={{ color: ok ? '#22c55e' : '#f59e0b' }}>
        {data.filled ?? 0} filled{(data.failed ?? 0) > 0 ? `, ${data.failed} failed` : ''} ({data.bucket ?? ''})
      </span>
    );
  }

  if (type === 'fill_error') {
    return (
      <span className="text-small" style={{ color: '#ef4444' }}>
        {data.code}: {data.message}
      </span>
    );
  }

  // Fallback: compact JSON
  return (
    <span className="text-muted text-small" style={{ wordBreak: 'break-all' }}>
      {JSON.stringify(data)}
    </span>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>{session.domain}</span>
        <span className="text-muted text-small">{fmt(session.startedAt)} {open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--border)' }}>
          {(session.events ?? []).map((ev, i) => (
            <div key={i} style={{ paddingTop: 8, paddingBottom: 4, borderBottom: i < session.events.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={badgeStyle(ev.type)}>{ev.type}</span>
                <span className="text-muted text-small" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  {new Date(ev.ts).toLocaleTimeString()}
                </span>
              </div>
              <EventDetail type={ev.type} data={ev.data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TraceTab ──────────────────────────────────────────────────────────────────

export default function TraceTab({ sessions, onRefresh, onClear }) {
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sessions, null, 2)).catch(() => {});
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn--ghost" style={{ fontSize: 11, flex: 1 }} onClick={onRefresh}>
          Refresh
        </button>
        <button className="btn btn--ghost" style={{ fontSize: 11, flex: 1 }} onClick={handleCopyJson} disabled={!sessions.length}>
          Copy JSON
        </button>
        <button className="btn btn--ghost btn--danger" style={{ fontSize: 11, flex: 1 }} onClick={onClear} disabled={!sessions.length}>
          Clear
        </button>
      </div>

      {sessions.length === 0 && (
        <p className="text-muted text-small">
          No trace sessions yet. Enable "Trace Form Fill" in Settings → Features, then click "Fill form".
        </p>
      )}

      {sessions.map(s => (
        <SessionCard key={s.id} session={s} />
      ))}
    </>
  );
}

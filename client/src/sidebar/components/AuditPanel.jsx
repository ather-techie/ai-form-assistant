import { useState, useEffect } from 'react';
import { MSG } from '../../shared/constants.js';

export default function AuditPanel() {
  const [tokenLog,    setTokenLog]    = useState([]);
  const [consentLog,  setConsentLog]  = useState([]);
  const [tab,         setTab]         = useState('tokens');
  const [clearing,    setClearing]    = useState(false);
  const [cleared,     setCleared]     = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_TOKEN_USAGE });
    if (res?.log) setTokenLog(res.log.slice().reverse());

    const consent = await chrome.storage.local.get('ai_ext:consent_log');
    setConsentLog((consent['ai_ext:consent_log'] ?? []).slice().reverse());
  };

  const handleClearAll = async () => {
    setClearing(true);
    await chrome.runtime.sendMessage({ type: MSG.CLEAR_DATA });
    setTokenLog([]);
    setConsentLog([]);
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const totalCost = tokenLog.reduce((sum, e) => sum + (e.estimatedCost ?? 0), 0);
  const totalIn   = tokenLog.reduce((sum, e) => sum + (e.inputTokens ?? 0), 0);
  const totalOut  = tokenLog.reduce((sum, e) => sum + (e.outputTokens ?? 0), 0);

  const fmt = (ts) => {
    try { return new Date(ts).toLocaleString(); } catch { return '—'; }
  };

  const mask = (val) => {
    if (!val || val.length <= 4) return '••••';
    return val.slice(0, 2) + '••••' + val.slice(-2);
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['tokens', 'consent'].map(t => (
          <button
            key={t}
            className={`btn btn--ghost${tab === t ? ' active' : ''}`}
            style={{ fontSize: 12, flex: 1, opacity: tab === t ? 1 : 0.6 }}
            onClick={() => setTab(t)}
          >
            {t === 'tokens' ? 'Token usage' : 'Consent log'}
          </button>
        ))}
      </div>

      {/* Token usage tab */}
      {tab === 'tokens' && (
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
      )}

      {/* Consent log tab */}
      {tab === 'consent' && (
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
      )}

      {/* Clear data */}
      <hr className="divider" />
      <div className="card__title" style={{ marginBottom: 8 }}>Privacy</div>
      <p className="text-muted text-small" style={{ marginBottom: 10 }}>
        Clears all saved settings, profiles, token history, and consent logs from this device.
      </p>
      <button
        className="btn btn--ghost btn--danger"
        onClick={handleClearAll}
        disabled={clearing}
        style={{ width: '100%' }}
      >
        {cleared ? '✓ Cleared' : clearing ? 'Clearing…' : 'Clear all data'}
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { MSG } from '../../shared/constants.js';
import { useFeatureFlags } from '../hooks/useFeatureFlags.js';
import TokenUsageTab from './audit/TokenUsageTab.jsx';
import ConsentLogTab from './audit/ConsentLogTab.jsx';
import TraceTab from './audit/TraceTab.jsx';
import PrivacySection from './audit/PrivacySection.jsx';
import { sectionHeaderStyle } from './sections/profileFieldConfigs.js';

export default function AuditPanel() {
  const features    = useFeatureFlags();
  const [tokenLog,   setTokenLog]    = useState([]);
  const [consentLog, setConsentLog]  = useState([]);
  const [traceSessions, setTraceSessions] = useState([]);
  const [open,       setOpen]        = useState({ tokens: true, consent: false, trace: false });
  const [clearing,   setClearing]    = useState(false);
  const [cleared,    setCleared]     = useState(false);

  const toggle = key => setOpen(o => {
    const next = { ...o, [key]: !o[key] };
    if (key === 'trace' && next.trace) handleRefreshTrace();
    return next;
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_TOKEN_USAGE });
    if (res?.log) setTokenLog(res.log.slice().reverse());

    const consent = await chrome.storage.local.get('ai_ext:consent_log');
    setConsentLog((consent['ai_ext:consent_log'] ?? []).slice().reverse());

    const traceRes = await chrome.runtime.sendMessage({ type: MSG.GET_TRACE_LOG });
    if (traceRes?.sessions) setTraceSessions(traceRes.sessions);
  };

  const handleRefreshTrace = async () => {
    const traceRes = await chrome.runtime.sendMessage({ type: MSG.GET_TRACE_LOG });
    if (traceRes?.sessions) setTraceSessions(traceRes.sessions);
  };

  const handleClearTrace = async () => {
    await chrome.storage.session.remove('ai_ext:trace_log');
    setTraceSessions([]);
  };

  const handleClearAll = async () => {
    setClearing(true);
    await chrome.runtime.sendMessage({ type: MSG.CLEAR_DATA });
    setTokenLog([]);
    setConsentLog([]);
    setTraceSessions([]);
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div>
      <div className="card" style={{ padding: 0, marginBottom: 8 }}>
        <button style={sectionHeaderStyle} onClick={() => toggle('tokens')}>
          <span>Token Usage</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{open.tokens ? '▼' : '▶'}</span>
        </button>
        {open.tokens && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
            <TokenUsageTab tokenLog={tokenLog} />
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 8 }}>
        <button style={sectionHeaderStyle} onClick={() => toggle('consent')}>
          <span>Consent Log</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{open.consent ? '▼' : '▶'}</span>
        </button>
        {open.consent && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
            <ConsentLogTab consentLog={consentLog} />
          </div>
        )}
      </div>

      {features.traceFormFill && (
        <div className="card" style={{ padding: 0, marginBottom: 8 }}>
          <button style={sectionHeaderStyle} onClick={() => toggle('trace')}>
            <span>Trace</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{open.trace ? '▼' : '▶'}</span>
          </button>
          {open.trace && (
            <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
              <TraceTab
                sessions={traceSessions}
                onRefresh={handleRefreshTrace}
                onClear={handleClearTrace}
              />
            </div>
          )}
        </div>
      )}

      <PrivacySection clearing={clearing} cleared={cleared} onClearAll={handleClearAll} />
    </div>
  );
}

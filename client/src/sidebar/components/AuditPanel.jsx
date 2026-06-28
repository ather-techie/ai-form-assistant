import { useState, useEffect } from 'react';
import { MSG } from '../../shared/constants.js';
import TokenUsageTab from './audit/TokenUsageTab.jsx';
import ConsentLogTab from './audit/ConsentLogTab.jsx';
import PrivacySection from './audit/PrivacySection.jsx';

export default function AuditPanel() {
  const [tokenLog,   setTokenLog]  = useState([]);
  const [consentLog, setConsentLog] = useState([]);
  const [tab,        setTab]       = useState('tokens');
  const [clearing,   setClearing]  = useState(false);
  const [cleared,    setCleared]   = useState(false);

  useEffect(() => { loadData(); }, []);

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

  return (
    <div>
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

      {tab === 'tokens' && <TokenUsageTab tokenLog={tokenLog} />}
      {tab === 'consent' && <ConsentLogTab consentLog={consentLog} />}

      <PrivacySection clearing={clearing} cleared={cleared} onClearAll={handleClearAll} />
    </div>
  );
}

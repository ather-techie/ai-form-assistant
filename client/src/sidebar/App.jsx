import { useState, useEffect, useCallback, useRef } from 'react';
import ChatPanel    from './components/ChatPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import AuditPanel   from './components/AuditPanel.jsx';
import CostBadge    from './components/CostBadge.jsx';
import { useFeatureFlags } from './hooks/useFeatureFlags.js';
import { MSG, KEEPALIVE_PORT_NAME } from '../shared/constants.js';

const BASE_VIEWS = ['Chat', 'Profile', 'Settings'];

export default function App() {
  const flags = useFeatureFlags();
  const [view,         setView]         = useState('Chat');
  const [domain,       setDomain]       = useState('');
  const [fieldCount,   setFieldCount]   = useState(0);
  const [lastUsage,    setLastUsage]    = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const [port,         setPort]         = useState(null);
  const [auditBadge,   setAuditBadge]   = useState(0);
  const auditLastViewedRef = useRef(0);

  // Establish keepalive port on mount
  useEffect(() => {
    const p = chrome.runtime.connect({ name: KEEPALIVE_PORT_NAME });
    setPort(p);
    p.onMessage.addListener(msg => {
      if (msg.type === 'token' && msg.text) {
        window.dispatchEvent(new CustomEvent('ai-ext:token', { detail: msg }));
      }
      if (msg.type === '__usage__') setLastUsage(msg);
      if (msg.type === 'reconnecting') {
        window.dispatchEvent(new CustomEvent('ai-ext:reconnecting'));
      }
    });
    p.onDisconnect.addListener(() => setPort(null));
    return () => p.disconnect();
  }, []);

  // Get current tab domain
  useEffect(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      if (tabs[0]?.url) {
        try { setDomain(new URL(tabs[0].url).hostname); } catch { /* ignore */ }
      }
    });
  }, []);

  // Listen for session key missing → show warning
  useEffect(() => {
    const check = async () => {
      const res = await chrome.runtime.sendMessage({ type: MSG.TEST_CONNECTION });
      if (res?.sessionExpired) setSessionValid(false);
    };
    check();
  }, []);

  // Audit tab unread badge — counts consent log entries since last visit
  useEffect(() => {
    const computeBadge = async () => {
      const r = await chrome.storage.local.get(['ai_ext:consent_log', 'ai_ext:audit_last_viewed']);
      const lastViewed = r['ai_ext:audit_last_viewed'] ?? 0;
      auditLastViewedRef.current = lastViewed;
      const log = r['ai_ext:consent_log'] ?? [];
      setAuditBadge(log.filter(e => e.timestamp > lastViewed).length);
    };
    computeBadge();

    const onChange = (changes, area) => {
      if (area !== 'local') return;
      if ('ai_ext:consent_log' in changes || 'ai_ext:audit_last_viewed' in changes) computeBadge();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const handleSetView = useCallback(v => {
    setView(v);
    if (v === 'Audit') {
      const now = Date.now();
      auditLastViewedRef.current = now;
      chrome.storage.local.set({ 'ai_ext:audit_last_viewed': now });
      setAuditBadge(0);
    }
  }, []);

  const onFieldsScanned = useCallback(count => setFieldCount(count), []);

  return (
    <div className="sidebar-shell">
      {/* Context strip */}
      <div className="context-strip">
        <span className="context-strip__domain" title={domain}>{domain || 'No page'}</span>
        {fieldCount > 0 && <span className="context-strip__badge">{fieldCount} fields</span>}
        {lastUsage && flags.costBadge && <CostBadge usage={lastUsage} />}
        {!sessionValid && (
          <span className="badge-warn" title="Session expired — re-enter API key in Settings">⚠ Key</span>
        )}
      </div>

      {/* View tabs */}
      <div className="view-tabs">
        {[...BASE_VIEWS, ...(flags.auditPanel ? ['Audit'] : [])].map(v => (
          <div key={v} className={`view-tab${view === v ? ' active' : ''}`} onClick={() => handleSetView(v)}>
            {v}
            {v === 'Audit' && auditBadge > 0 && (
              <span className="audit-badge">{auditBadge > 99 ? '99+' : auditBadge}</span>
            )}
          </div>
        ))}
      </div>

      {/* Active view */}
      <div className="view-body">
        {view === 'Chat'     && <ChatPanel    domain={domain} port={port} onFieldsScanned={onFieldsScanned} onUsage={setLastUsage} />}
        {view === 'Profile'  && <ProfilePanel />}
        {view === 'Settings' && <SettingsPanel onSessionRestored={() => setSessionValid(true)} />}
        {view === 'Audit'    && flags.auditPanel && <AuditPanel />}
      </div>
    </div>
  );
}

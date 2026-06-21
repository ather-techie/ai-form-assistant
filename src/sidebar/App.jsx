import { useState, useEffect, useCallback } from 'react';
import ChatPanel    from './components/ChatPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import AuditPanel   from './components/AuditPanel.jsx';
import CostBadge    from './components/CostBadge.jsx';
import { MSG, KEEPALIVE_PORT_NAME } from '../shared/constants.js';

const VIEWS = ['Chat', 'Profile', 'Settings', 'Audit'];

export default function App() {
  const [view,         setView]         = useState('Chat');
  const [domain,       setDomain]       = useState('');
  const [fieldCount,   setFieldCount]   = useState(0);
  const [lastUsage,    setLastUsage]    = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const [port,         setPort]         = useState(null);

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
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
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

  const onFieldsScanned = useCallback(count => setFieldCount(count), []);

  return (
    <div className="sidebar-shell">
      {/* Context strip */}
      <div className="context-strip">
        <span className="context-strip__domain" title={domain}>{domain || 'No page'}</span>
        {fieldCount > 0 && <span className="context-strip__badge">{fieldCount} fields</span>}
        {lastUsage && <CostBadge usage={lastUsage} />}
        {!sessionValid && (
          <span className="badge-warn" title="Session expired — re-enter API key in Settings">⚠ Key</span>
        )}
      </div>

      {/* View tabs */}
      <div className="view-tabs">
        {VIEWS.map(v => (
          <div key={v} className={`view-tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{v}</div>
        ))}
      </div>

      {/* Active view */}
      <div className="view-body">
        {view === 'Chat'     && <ChatPanel    domain={domain} port={port} onFieldsScanned={onFieldsScanned} onUsage={setLastUsage} />}
        {view === 'Profile'  && <ProfilePanel />}
        {view === 'Settings' && <SettingsPanel onSessionRestored={() => setSessionValid(true)} />}
        {view === 'Audit'    && <AuditPanel />}
      </div>
    </div>
  );
}

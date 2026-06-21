import { useState } from 'react';
import SettingsPanel from '../sidebar/components/SettingsPanel.jsx';
import AuditPanel    from '../sidebar/components/AuditPanel.jsx';
import ProfilePanel  from '../sidebar/components/ProfilePanel.jsx';

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'profile',  label: 'Profile & Templates' },
  { id: 'audit',    label: 'Audit & Privacy' },
];

export default function OptionsApp() {
  const [tab, setTab] = useState('settings');

  return (
    <div className="options-shell">
      <div className="options-header">
        <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✦</div>
        <h1>AI Form Assistant</h1>
      </div>

      <div className="options-tabs">
        {TABS.map(t => (
          <div key={t.id} className={`options-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'settings' && <SettingsPanel />}
      {tab === 'profile'  && <ProfilePanel />}
      {tab === 'audit'    && <AuditPanel />}
    </div>
  );
}

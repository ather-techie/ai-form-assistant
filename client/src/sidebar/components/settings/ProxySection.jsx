import { useState } from 'react';
import { MSG, PROVIDERS } from '../../../shared/constants.js';

export default function ProxySection({ settings, onSettingChange }) {
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setStatus('Testing…');
    const res = await chrome.runtime.sendMessage({ type: MSG.TEST_CONNECTION });
    setTesting(false);
    setStatus(res?.ok ? `✓ Connected (${res.latencyMs}ms)` : `✗ ${res?.error ?? 'Failed'}`);
  };

  return (
    <>
      <div className="card__title" style={{ marginBottom: 12 }}>Proxy</div>

      <div className="field-group">
        <label>Proxy URL</label>
        <input
          value={settings.proxyUrl}
          onChange={e => onSettingChange('proxyUrl', e.target.value)}
          placeholder="http://localhost:3000"
        />
      </div>

      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <button className="btn btn--ghost" onClick={handleTest} disabled={testing} style={{ fontSize: 12 }}>
          Test connection
        </button>
        {status && (
          <span
            className="text-small"
            style={{ color: status.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}
          >
            {status}
          </span>
        )}
      </div>

      {settings.provider === PROVIDERS.LOCAL && (
        <>
          <hr className="divider" />
          <div className="card__title" style={{ marginBottom: 12 }}>Local LLM</div>
          <div className="row" style={{ gap: 8 }}>
            <div className="field-group" style={{ flex: 2 }}>
              <label>Host</label>
              <input
                value={settings.localLlmHost}
                onChange={e => onSettingChange('localLlmHost', e.target.value)}
                placeholder="localhost"
              />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Port</label>
              <input
                type="number"
                value={settings.localLlmPort}
                onChange={e => onSettingChange('localLlmPort', Number(e.target.value))}
                placeholder="11434"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

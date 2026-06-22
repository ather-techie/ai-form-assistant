import { useState, useEffect } from 'react';
import { MSG, PROVIDERS, MODELS, DEFAULT_SETTINGS } from '../../shared/constants.js';

export default function SettingsPanel({ onSessionRestored }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [apiKey,   setApiKey]   = useState('');
  const [status,   setStatus]   = useState('');
  const [testing,  setTesting]  = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [customPending, setCustomPending] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: 'default' })
      .then(() => {})
      .catch(() => {});
    // Load current settings from storage directly
    chrome.storage.local.get('ai_ext:settings').then(r => {
      if (r['ai_ext:settings']) {
        const saved = r['ai_ext:settings'];
        setSettings(prev => ({ ...prev, ...saved }));
        // Pre-fill custom input if stored model isn't in the known list
        if (saved.model && saved.provider) {
          const known = (MODELS[saved.provider] ?? []).map(m => m.id);
          if (!known.includes(saved.model)) setCustomModel(saved.model);
        }
      }
    });
  }, []);

  const patch = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const payload = { ...settings };
    if (apiKey.trim()) payload.apiKeyPlaintext = apiKey.trim();
    await chrome.runtime.sendMessage({ type: MSG.UPDATE_SETTINGS, settings: payload });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (apiKey.trim() && onSessionRestored) onSessionRestored();
    setApiKey('');
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus('Testing…');
    const res = await chrome.runtime.sendMessage({ type: MSG.TEST_CONNECTION });
    setTesting(false);
    setStatus(res?.ok ? `✓ Connected (${res.latencyMs}ms)` : `✗ ${res?.error ?? 'Failed'}`);
  };

  const models = MODELS[settings.provider] ?? [];
  const isCustom = !!settings.model && !models.some(m => m.id === settings.model);
  const showCustomInput = isCustom || customPending;

  const handleProviderChange = e => {
    const p = e.target.value;
    patch('provider', p);
    patch('model', MODELS[p]?.[0]?.id ?? '');
    setCustomModel('');
    setCustomPending(false);
  };

  const handleModelChange = e => {
    if (e.target.value === '__custom__') {
      setCustomPending(true);
      setCustomModel('');
      // leave settings.model unchanged until user types
    } else {
      setCustomPending(false);
      setCustomModel('');
      patch('model', e.target.value);
    }
  };

  return (
    <div>
      <div className="card__title" style={{ marginBottom: 12 }}>AI Provider</div>

      <div className="field-group">
        <label>Provider</label>
        <select value={settings.provider} onChange={handleProviderChange}>
          {Object.values(PROVIDERS).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Model</label>
        <select value={isCustom || customPending ? '__custom__' : settings.model} onChange={handleModelChange}>
          {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
        {showCustomInput && (
          <input
            style={{ marginTop: 6 }}
            value={customModel}
            onChange={e => { setCustomModel(e.target.value); patch('model', e.target.value); setCustomPending(false); }}
            placeholder="Enter model ID (e.g. claude-opus-4-8)"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </div>

      <div className="field-group">
        <label>API key {settings.apiKeyCiphertext ? '(saved — enter to update)' : ''}</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={settings.apiKeyCiphertext ? '••••••••' : 'Paste your API key'}
          autoComplete="off"
        />
        {!settings.apiKeyCiphertext && (
          <span className="text-muted text-small">Key is encrypted with a session key. You'll be asked to re-enter after browser restart.</span>
        )}
      </div>

      <hr className="divider" />
      <div className="card__title" style={{ marginBottom: 12 }}>Proxy</div>

      <div className="field-group">
        <label>Proxy URL</label>
        <input value={settings.proxyUrl} onChange={e => patch('proxyUrl', e.target.value)} placeholder="http://localhost:3000" />
      </div>

      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <button className="btn btn--ghost" onClick={handleTest} disabled={testing} style={{ fontSize: 12 }}>Test connection</button>
        {status && <span className={`text-small ${status.startsWith('✓') ? '' : 'text-muted'}`} style={{ color: status.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{status}</span>}
      </div>

      {settings.provider === PROVIDERS.LOCAL && (
        <>
          <hr className="divider" />
          <div className="card__title" style={{ marginBottom: 12 }}>Local LLM</div>
          <div className="row" style={{ gap: 8 }}>
            <div className="field-group" style={{ flex: 2 }}>
              <label>Host</label>
              <input value={settings.localLlmHost} onChange={e => patch('localLlmHost', e.target.value)} placeholder="localhost" />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Port</label>
              <input type="number" value={settings.localLlmPort} onChange={e => patch('localLlmPort', Number(e.target.value))} placeholder="11434" />
            </div>
          </div>
        </>
      )}

      <hr className="divider" />

      <div className="row row--between" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>Show cost badge</label>
        <input type="checkbox" checked={settings.costDisplayEnabled} onChange={e => patch('costDisplayEnabled', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
      </div>

      <button className="btn" onClick={handleSave} style={{ width: '100%' }}>
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}

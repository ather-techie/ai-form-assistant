import { useState, useEffect } from 'react';
import { PROVIDERS, MODELS } from '../../../shared/constants.js';
import { sectionHeaderStyle } from '../sections/profileFieldConfigs.js';

export default function AiProviderSection({ settings, onSettingChange, apiKey, onApiKeyChange, isOpen, onToggle }) {
  const [customModel, setCustomModel] = useState('');
  const [customPending, setCustomPending] = useState(false);

  const models = MODELS[settings.provider] ?? [];
  const isCustom = !!settings.model && !models.some(m => m.id === settings.model);
  const showCustomInput = isCustom || customPending;

  useEffect(() => {
    if (settings.model) {
      const known = (MODELS[settings.provider] ?? []).map(m => m.id);
      if (!known.includes(settings.model)) setCustomModel(settings.model);
    }
  }, [settings.provider, settings.model]);

  const handleProviderChange = e => {
    const p = e.target.value;
    onSettingChange('provider', p);
    onSettingChange('model', MODELS[p]?.[0]?.id ?? '');
    setCustomModel('');
    setCustomPending(false);
  };

  const handleModelChange = e => {
    if (e.target.value === '__custom__') {
      setCustomPending(true);
      setCustomModel('');
    } else {
      setCustomPending(false);
      setCustomModel('');
      onSettingChange('model', e.target.value);
    }
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>AI Provider</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
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
                onChange={e => { setCustomModel(e.target.value); onSettingChange('model', e.target.value); setCustomPending(false); }}
                placeholder="Enter model ID (e.g. claude-opus-4-8)"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label>API key {settings.apiKeyCiphertext ? '(saved — enter to update)' : ''}</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => onApiKeyChange(e.target.value)}
              placeholder={settings.apiKeyCiphertext ? '••••••••' : 'Paste your API key'}
              autoComplete="off"
            />
            {!settings.apiKeyCiphertext && (
              <span className="text-muted text-small">Key is encrypted with a session key. You'll be asked to re-enter after browser restart.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

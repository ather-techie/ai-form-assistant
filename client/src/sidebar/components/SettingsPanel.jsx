import { useState, useEffect } from 'react';
import { MSG, DEFAULT_SETTINGS, MODELS } from '../../shared/constants.js';
import AiProviderSection from './settings/AiProviderSection.jsx';
import ProxySection from './settings/ProxySection.jsx';
import FeaturesSection from './settings/FeaturesSection.jsx';
import ProfileSectionsSection from './settings/ProfileSectionsSection.jsx';

export default function SettingsPanel({ onSessionRestored }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: 'default' })
      .then(() => {})
      .catch(() => {});
    chrome.storage.local.get('ai_ext:settings').then(async r => {
      const stored = r['ai_ext:settings'] ?? {};

      const localOverrides = { ...(stored.features ?? {}) };
      if ('costDisplayEnabled' in stored && !('costBadge' in localOverrides)) {
        localOverrides.costBadge = stored.costDisplayEnabled;
      }

      const proxyUrl = stored.proxyUrl ?? DEFAULT_SETTINGS.proxyUrl;
      let remoteFlags = {};
      try {
        const res = await fetch(`${proxyUrl}/v1/flags`);
        if (res.ok) remoteFlags = await res.json();
      } catch { /* proxy offline — fall through */ }

      const mergedFeatures = { ...DEFAULT_SETTINGS.features, ...remoteFlags, ...localOverrides };
      setSettings(prev => ({ ...prev, ...stored, features: mergedFeatures }));
    });
  }, []);

  const patch = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const patchFeature = (key, val) => setSettings(prev => ({ ...prev, features: { ...prev.features, [key]: val } }));

  const handleSave = async () => {
    const payload = { ...settings };
    if (apiKey.trim()) payload.apiKeyPlaintext = apiKey.trim();
    await chrome.runtime.sendMessage({ type: MSG.UPDATE_SETTINGS, settings: payload });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (apiKey.trim() && onSessionRestored) onSessionRestored();
    setApiKey('');
  };

  return (
    <div>
      <AiProviderSection
        settings={settings}
        onSettingChange={patch}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      <hr className="divider" />
      <ProxySection settings={settings} onSettingChange={patch} />

      <hr className="divider" />
      <FeaturesSection features={settings.features} onFeatureChange={patchFeature} />

      <hr className="divider" />
      <ProfileSectionsSection features={settings.features} onFeatureChange={patchFeature} />

      <button className="btn" onClick={handleSave} style={{ width: '100%' }}>
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}

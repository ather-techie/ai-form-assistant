import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS }    from '../../shared/constants.js';

const DEFAULT_FLAGS = DEFAULT_SETTINGS.features;

export function useFeatureFlags() {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  useEffect(() => {
    chrome.storage.local.get('ai_ext:settings').then(async r => {
      const stored = r['ai_ext:settings'] ?? {};

      // Local user overrides (saved via Settings panel)
      const localOverrides = { ...(stored.features ?? {}) };
      if ('costDisplayEnabled' in stored && !('costDisplay' in localOverrides)) {
        localOverrides.costDisplay = stored.costDisplayEnabled;
      }

      // Fetch remote flags from proxy (source of truth for operator config)
      const proxyUrl = stored.proxyUrl ?? DEFAULT_SETTINGS.proxyUrl;
      let remoteFlags = {};
      try {
        const res = await fetch(`${proxyUrl}/v1/flags`);
        if (res.ok) remoteFlags = await res.json();
      } catch {
        // proxy not running — fall through to defaults + local overrides
      }

      // Merge order: hardcoded defaults → remote config → local user overrides
      setFlags({ ...DEFAULT_FLAGS, ...remoteFlags, ...localOverrides });
    });
  }, []);

  return flags;
}

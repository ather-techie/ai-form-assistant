/**
 * AdapterRegistry — Open/Closed pattern.
 * Service worker imports only getAdapter(). Adding a new provider
 * never requires editing the service worker.
 */
import claude from './claude.js';
import openai from './openai.js';
import gemini from './gemini.js';
import local  from './local.js';

const registry = { claude, openai, gemini, local };

export function getAdapter(provider) {
  const adapter = registry[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}

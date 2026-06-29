/**
 * fieldRouter.js — Routes classified fields into three buckets:
 *   static  → fill directly from profile (certain/high confidence)
 *   smart   → send to AI for generation
 *   preview → low confidence, shown to user before AI call
 */

import { CONFIDENCE } from '../shared/constants.js';
import { getProfile }  from '../shared/storage.js';

/**
 * @param {Array}  fields      - From fieldScanner
 * @param {string} templateId  - Profile template to check against
 * @returns {Promise<{ static: Array, smart: Array, preview: Array }>}
 */
/** camelCase / snake_case / kebab-case → lowercase no separators */
function normaliseKey(k) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function routeFields(fields, templateId) {
  const profile    = await getProfile(templateId);
  const savedKeys  = Object.keys(profile.fields);

  // Build a normalised lookup so "job_title" matches "jobTitle", etc.
  const normalisedProfileMap = {};
  for (const k of savedKeys) {
    normalisedProfileMap[normaliseKey(k)] = profile.fields[k];
  }

  const staticFields  = [];
  const smartFields   = [];
  const previewFields = [];

  for (const field of fields) {
    // Check exact matches and record which key hit
    let exactValue, exactKey;
    if (profile.fields[field.id] !== undefined) {
      exactValue = profile.fields[field.id];
      exactKey   = field.id;
    } else if (profile.fields[field.classification] !== undefined) {
      exactValue = profile.fields[field.classification];
      exactKey   = field.classification;
    }

    // Normalised fallback: "job_title" ↔ "jobTitle", "firstName" ↔ "first_name", etc.
    let normValue, normKey;
    if (exactValue === undefined) {
      const nId    = normaliseKey(field.id);
      const nClass = normaliseKey(field.classification);
      if (normalisedProfileMap[nId] !== undefined) {
        normValue = normalisedProfileMap[nId];
        normKey   = field.id;
      } else if (normalisedProfileMap[nClass] !== undefined) {
        normValue = normalisedProfileMap[nClass];
        normKey   = field.classification;
      }
    }

    if (exactValue !== undefined || normValue !== undefined) {
      staticFields.push({
        ...field,
        value:       exactValue ?? normValue,
        _matchType:  exactValue !== undefined ? 'exact' : 'normalized',
        _profileKey: exactKey ?? normKey,
      });
      continue;
    }

    // Confidence below threshold → needs user preview before AI call
    if (field.confidence < CONFIDENCE.THRESHOLD) {
      previewFields.push(field);
      continue;
    }

    // High confidence, no profile match → AI generates the value
    smartFields.push(field);
  }

  return { static: staticFields, smart: smartFields, preview: previewFields };
}

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
export async function routeFields(fields, templateId) {
  const profile    = await getProfile(templateId);
  const savedKeys  = Object.keys(profile.fields);

  const staticFields  = [];
  const smartFields   = [];
  const previewFields = [];

  for (const field of fields) {
    // Profile has an exact match → static fill regardless of confidence
    if (savedKeys.includes(field.id) || savedKeys.includes(field.classification)) {
      staticFields.push({
        ...field,
        value: profile.fields[field.id] ?? profile.fields[field.classification],
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

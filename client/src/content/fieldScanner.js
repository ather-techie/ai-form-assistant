/**
 * fieldScanner.js — Scans live DOM for form fields and returns
 * confidence-scored classifications.
 *
 * Returns: Array<{ id, name, label, type, placeholder, classification, confidence }>
 */

import { CONFIDENCE } from '../shared/constants.js';

// ─── Vocabulary ───────────────────────────────────────────────────────────────
// Maps known terms → canonical classification

const VOCAB = {
  // Name
  firstname: 'name', first_name: 'name', fname: 'name',
  lastname: 'name',  last_name: 'name',  lname: 'name',
  fullname: 'name',  full_name: 'name',  name: 'name',

  // Email
  email: 'email', emailaddress: 'email', email_address: 'email',
  'e-mail': 'email',

  // Phone
  phone: 'phone', telephone: 'phone', tel: 'phone', mobile: 'phone',
  cell: 'phone', phonenumber: 'phone', phone_number: 'phone',

  // Address
  address: 'address', street: 'address', streetaddress: 'address',
  addr: 'address', address1: 'address', address2: 'address',
  city: 'address', state: 'address', zip: 'address', zipcode: 'address',
  postcode: 'address', country: 'address',

  // Date / time
  date: 'date', dob: 'date', birthday: 'date', birthdate: 'date',
  dateofbirth: 'date', startdate: 'date', enddate: 'date',

  // Identity
  username: 'username', user_name: 'username', userid: 'username',
  password: 'password', passwd: 'password',
  ssn: 'ssn', socialsecurity: 'ssn',

  // Organisation
  company: 'company', organization: 'company', organisation: 'company',
  employer: 'company', business: 'company',

  // Job / education
  jobtitle: 'job_title', job_title: 'job_title', title: 'job_title',
  position: 'job_title', role: 'job_title',
  school: 'education', university: 'education', college: 'education',
  degree: 'education',

  // Finance
  creditcard: 'credit_card', cardnumber: 'credit_card',
  cvv: 'credit_card', expiry: 'credit_card', expirydate: 'credit_card',

  // Web
  website: 'url', url: 'url', linkedin: 'url', github: 'url', portfolio: 'url',

  // Misc
  message: 'text', description: 'text', bio: 'text', summary: 'text',
  comments: 'text', notes: 'text', subject: 'text',
  quantity: 'number', amount: 'number', number: 'number', age: 'number',
  gender: 'gender', sex: 'gender',
};

// ─── Ignored input types ──────────────────────────────────────────────────────

const IGNORED_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio']);

// ─── Main export ──────────────────────────────────────────────────────────────

export function scanFields() {
  const inputs    = document.querySelectorAll('input, select, textarea');
  const results   = [];
  let   autoIndex = 0;

  for (const el of inputs) {
    if (IGNORED_TYPES.has(el.type?.toLowerCase())) continue;
    if (el.offsetParent === null && el.type !== 'email') continue; // hidden from layout

    const id          = el.id || el.name || `field_${autoIndex++}`;
    const labelText   = getLabel(el);
    const hint        = normalise(el.name ?? '') || normalise(el.id ?? '') || normalise(labelText) || normalise(el.placeholder ?? '');
    const { classification, confidence } = classify(hint, el, labelText);

    results.push({
      id,
      name:           el.name || '',
      label:          labelText || el.placeholder || el.name || id,
      type:           el.tagName === 'SELECT' ? 'select' : (el.type || 'text'),
      placeholder:    el.placeholder || '',
      classification,
      confidence,
      element:        el,   // reference for injector — not serialised over message
    });
  }

  return results;
}

// ─── Classification logic ─────────────────────────────────────────────────────

function classify(hint, el, labelText) {
  // 1.0 — exact match on name or id attribute
  if (VOCAB[normalise(el.name ?? '')] || VOCAB[normalise(el.id ?? '')]) {
    const key = normalise(el.name ?? '') || normalise(el.id ?? '');
    return { classification: VOCAB[key], confidence: CONFIDENCE.CERTAIN };
  }

  // Check aria-label
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  if (VOCAB[normalise(ariaLabel)]) {
    return { classification: VOCAB[normalise(ariaLabel)], confidence: CONFIDENCE.CERTAIN };
  }

  // 0.8 — label text match
  if (labelText && VOCAB[normalise(labelText)]) {
    return { classification: VOCAB[normalise(labelText)], confidence: CONFIDENCE.HIGH };
  }

  // Partial match — check if any vocab key is a substring of the hint
  const partialMatch = Object.keys(VOCAB).find(k => hint.includes(k));
  if (partialMatch) {
    return { classification: VOCAB[partialMatch], confidence: CONFIDENCE.MEDIUM };
  }

  // input type hints
  if (el.type === 'email') return { classification: 'email',  confidence: CONFIDENCE.HIGH };
  if (el.type === 'tel')   return { classification: 'phone',  confidence: CONFIDENCE.HIGH };
  if (el.type === 'url')   return { classification: 'url',    confidence: CONFIDENCE.HIGH };
  if (el.type === 'date')  return { classification: 'date',   confidence: CONFIDENCE.HIGH };
  if (el.type === 'number')return { classification: 'number', confidence: CONFIDENCE.MEDIUM };

  // 0.3 — no recognisable signal
  if (hint) return { classification: 'text', confidence: CONFIDENCE.LOW };
  return { classification: 'unknown', confidence: CONFIDENCE.LOW };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLabel(el) {
  // Explicit label[for]
  if (el.id) {
    const lbl = document.querySelector(`label[for="${el.id}"]`);
    if (lbl) return lbl.textContent.trim();
  }
  // Wrapping label
  const parent = el.closest('label');
  if (parent) return parent.textContent.replace(el.value, '').trim();
  // aria-labelledby
  const lblId = el.getAttribute('aria-labelledby');
  if (lblId) {
    const ref = document.getElementById(lblId);
    if (ref) return ref.textContent.trim();
  }
  return '';
}

/** Lowercase, strip non-alphanumeric for vocab lookup */
function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

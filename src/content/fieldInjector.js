/**
 * fieldInjector.js — Writes values into DOM fields and dispatches
 * native input/change events so frameworks (React, Vue, Angular) detect them.
 */

/**
 * @param {Array<{ id, value, element }>} fills  - Fields with resolved values
 * @returns {{ filled: number, failed: number }}
 */
export function injectFields(fills) {
  let filled = 0, failed = 0;

  for (const { id, value, element } of fills) {
    const el = element ?? findElement(id);
    if (!el) { failed++; continue; }

    try {
      if (el.tagName === 'SELECT') {
        setSelectValue(el, value);
      } else {
        setInputValue(el, value);
      }
      filled++;
    } catch {
      failed++;
    }
  }

  return { filled, failed };
}

// ─── Input / Textarea ─────────────────────────────────────────────────────────

function setInputValue(el, value) {
  // Use native input value setter so React's synthetic event system picks it up
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    'value',
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Select ───────────────────────────────────────────────────────────────────

function setSelectValue(el, value) {
  // Try exact match, then case-insensitive, then partial
  const options = [...el.options];

  const exactMatch = options.find(o =>
    o.value === value || o.text === value,
  );
  const caseMatch = options.find(o =>
    o.value.toLowerCase() === value.toLowerCase() ||
    o.text.toLowerCase()  === value.toLowerCase(),
  );
  const partialMatch = options.find(o =>
    o.value.toLowerCase().includes(value.toLowerCase()) ||
    o.text.toLowerCase().includes(value.toLowerCase()),
  );

  const match = exactMatch ?? caseMatch ?? partialMatch;
  if (!match) return;

  el.value = match.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── DOM lookup fallback ──────────────────────────────────────────────────────

function findElement(id) {
  return document.getElementById(id)
    ?? document.querySelector(`[name="${id}"]`)
    ?? null;
}

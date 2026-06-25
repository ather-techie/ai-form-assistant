/**
 * content.js — Injected into the active tab after activeTab grant.
 * Bridges the service worker ↔ DOM: scans fields and injects values.
 * Must be a self-contained IIFE bundle (no ES module imports at runtime).
 */

(function () {
  'use strict';

  // Guard against double-injection (manifest auto-inject + executeScript on same page)
  if (window.__aiFormAssistantLoaded) return;
  window.__aiFormAssistantLoaded = true;

  // ── Vocabulary & constants (inlined — no imports in content script) ──────────

  const IGNORED_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio']);
  const CONFIDENCE_THRESHOLD = 0.6;

  const VOCAB = {
    firstname:'name',first_name:'name',fname:'name',lastname:'name',last_name:'name',
    lname:'name',fullname:'name',full_name:'name',name:'name',
    email:'email',emailaddress:'email',email_address:'email',
    phone:'phone',telephone:'phone',tel:'phone',mobile:'phone',cell:'phone',
    phonenumber:'phone',phone_number:'phone',
    address:'address',street:'address',streetaddress:'address',addr:'address',
    address1:'address',address2:'address',city:'address',state:'address',
    zip:'address',zipcode:'address',postcode:'address',country:'address',
    date:'date',dob:'date',birthday:'date',birthdate:'date',dateofbirth:'date',
    username:'username',user_name:'username',password:'password',
    company:'company',organization:'company',organisation:'company',
    jobtitle:'job_title',job_title:'job_title',title:'job_title',position:'job_title',
    website:'url',url:'url',linkedin:'url',github:'url',
    message:'text',description:'text',bio:'text',summary:'text',comments:'text',notes:'text',
    quantity:'number',amount:'number',age:'number',gender:'gender',
  };

  function norm(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

  function getLabel(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    const parent = el.closest('label');
    if (parent) return parent.textContent.replace(el.value||'','').trim();
    const lblId = el.getAttribute('aria-labelledby');
    if (lblId) { const ref = document.getElementById(lblId); if (ref) return ref.textContent.trim(); }
    return '';
  }

  function classifyField(el, labelText) {
    const byName  = norm(el.name||'');
    const byId    = norm(el.id||'');
    const byAria  = norm(el.getAttribute('aria-label')||'');
    const byLabel = norm(labelText);
    const byType  = el.type?.toLowerCase();

    if (VOCAB[byName] || VOCAB[byId]) {
      const k = VOCAB[byName] || VOCAB[byId];
      return { classification: k, confidence: 1.0 };
    }
    if (VOCAB[byAria])  return { classification: VOCAB[byAria],  confidence: 1.0 };
    if (VOCAB[byLabel]) return { classification: VOCAB[byLabel], confidence: 0.8 };

    const hint    = byName || byId || byLabel || norm(el.placeholder||'');
    const partial = Object.keys(VOCAB).find(k => hint.includes(k));
    if (partial) return { classification: VOCAB[partial], confidence: 0.6 };

    if (byType === 'email') return { classification: 'email',  confidence: 0.8 };
    if (byType === 'tel')   return { classification: 'phone',  confidence: 0.8 };
    if (byType === 'url')   return { classification: 'url',    confidence: 0.8 };
    if (byType === 'date')  return { classification: 'date',   confidence: 0.8 };
    if (byType === 'number')return { classification: 'number', confidence: 0.6 };

    return { classification: 'text', confidence: 0.3 };
  }

  function scanFields() {
    const inputs  = document.querySelectorAll('input, select, textarea');
    const results = [];
    let   idx     = 0;

    for (const el of inputs) {
      if (IGNORED_TYPES.has(el.type?.toLowerCase())) continue;
      if (el.offsetParent === null && el.type !== 'email') continue;

      const labelText = getLabel(el);
      const id        = el.id || el.name || `field_${idx++}`;
      const { classification, confidence } = classifyField(el, labelText);

      results.push({
        id, name: el.name||'',
        label:       labelText || el.placeholder || el.name || id,
        type:        el.tagName === 'SELECT' ? 'select' : (el.type||'text'),
        placeholder: el.placeholder||'',
        classification, confidence,
      });
    }
    return results;
  }

  // ── Injector ──────────────────────────────────────────────────────────────

  function injectFields(fills) {
    let filled = 0, failed = 0;
    for (const { id, value } of fills) {
      const el = document.getElementById(id)
              ?? document.querySelector(`[name="${id}"]`);
      if (!el || !value) { failed++; continue; }
      try {
        if (el.tagName === 'SELECT') {
          const opts    = [...el.options];
          const match   = opts.find(o => o.value===value||o.text===value)
                       ?? opts.find(o => o.text.toLowerCase().includes(value.toLowerCase()));
          if (match) { el.value = match.value; el.dispatchEvent(new Event('change',{bubbles:true})); filled++; }
        } else {
          const setter = Object.getOwnPropertyDescriptor(
            el.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value',
          )?.set;
          setter ? setter.call(el, value) : (el.value = value);
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        }
      } catch { failed++; }
    }
    return { filled, failed };
  }

  // ── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SCAN_FIELDS') {
      sendResponse({ fields: scanFields() });
    } else if (msg.type === 'INJECT_FIELDS') {
      sendResponse(injectFields(msg.fills));
    }
    return true;
  });

})();

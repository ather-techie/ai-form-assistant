import { useState, useEffect, useRef, useCallback } from 'react';
import PromptPreview from './PromptPreview.jsx';
import { MSG, DEFAULT_TEMPLATE_ID } from '../../shared/constants.js';

export default function ChatPanel({ domain, port, onFieldsScanned, onUsage }) {
  const [messages,  setMessages]  = useState([{ role: 'system', content: 'Ready. Click "Fill form" to scan this page.' }]);
  const [input,     setInput]     = useState('');
  const [busy,      setBusy]      = useState(false);
  const [streaming, setStreaming] = useState('');
  const [preview,      setPreview]      = useState(null);   // { previewFields, staticFields, smartFields }
  const [profileFields, setProfileFields] = useState({});
  const [consent,      setConsent]      = useState(null);   // { id, field, value, domain }
  const endRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  // Listen for streaming tokens from keepalive port
  useEffect(() => {
    const onToken = e => setStreaming(prev => prev + e.detail.text);
    const onDone  = () => {
      setMessages(prev => [...prev, { role: 'assistant', content: streaming || '...' }]);
      setStreaming('');
      setBusy(false);
    };
    const onReconn = () => addMsg('system', 'Connection dropped — reconnecting...');
    window.addEventListener('ai-ext:token',        onToken);
    window.addEventListener('ai-ext:stream-done',  onDone);
    window.addEventListener('ai-ext:reconnecting', onReconn);
    return () => {
      window.removeEventListener('ai-ext:token',        onToken);
      window.removeEventListener('ai-ext:stream-done',  onDone);
      window.removeEventListener('ai-ext:reconnecting', onReconn);
    };
  }, [streaming]);

  // Consent toast listener
  useEffect(() => {
    const handler = e => setConsent(e.detail);
    window.addEventListener('ai-ext:consent-request', handler);
    return () => window.removeEventListener('ai-ext:consent-request', handler);
  }, []);

  const addMsg = (role, content) => setMessages(prev => [...prev, { role, content }]);

  // ── Fill form ──────────────────────────────────────────────────────────────
  const handleFillForm = useCallback(async () => {
    setBusy(true);
    addMsg('system', 'Scanning form fields...');

    try {
      // Inject content script + scan
      const [tab]    = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const url      = tab?.url ?? '';
      if (!tab || !url.startsWith('http')) {
        addMsg('system', 'Navigate to a web page first — this extension cannot run on browser internal pages.');
        setBusy(false);
        return;
      }
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/content.js'] });
      const scan     = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
      const fields   = scan?.fields ?? [];
      onFieldsScanned(fields.length);

      if (!fields.length) {
        addMsg('system', 'No fillable fields found on this page.');
        setBusy(false);
        return;
      }

      const pageTitle = tab?.title ?? '';

      const res = await chrome.runtime.sendMessage({
        type:       MSG.FILL_FORM,
        domain,
        pageTitle,
        fields,
        templateId: DEFAULT_TEMPLATE_ID,
      });

      if (res?.error) { addMsg('error', res.error.message); setBusy(false); return; }

      if (res?.needsPreview) {
        const profileRes = await chrome.runtime.sendMessage({
          type: MSG.GET_PROFILE, templateId: DEFAULT_TEMPLATE_ID,
        });
        setProfileFields(profileRes?.profile?.fields ?? {});

        // Inject profile-matched fields immediately — don't wait for preview confirmation
        if (res?.staticFields?.length) {
          const fills = res.staticFields.map(f => ({ id: f.id, value: f.value }));
          await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
          addMsg('system', `Filled ${fills.length} field${fills.length > 1 ? 's' : ''} from your profile.`);
        }

        setPreview(res);
        setBusy(false);
        return;
      }

      // Inject static fills immediately
      if (res?.staticFields?.length) {
        const fills = res.staticFields.map(f => ({ id: f.id, value: f.value }));
        await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
        addMsg('system', `Filled ${fills.length} fields from your profile.`);
      }

      // AI values stream in via tokens; when done we inject
      if (res?.aiValues && Object.keys(res.aiValues).length) {
        const fills = Object.entries(res.aiValues).map(([id, value]) => ({ id, value }));
        await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
      }
    } catch (err) {
      addMsg('error', err.message ?? 'Something went wrong.');
      setBusy(false);
    }
  }, [domain, onFieldsScanned]);

  // ── Chat send ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || busy) return;
    const content = input.trim();
    setInput('');
    addMsg('user', content);
    setBusy(true);
    setStreaming('');

    const res = await chrome.runtime.sendMessage({
      type: MSG.CHAT_MESSAGE, domain, content,
    });

    if (res?.error) {
      addMsg('error', res.error.message);
      setBusy(false);
    }
    // Streaming completion fires ai-ext:stream-done → setBusy(false)
  }, [input, busy, domain]);

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Preview confirmed ──────────────────────────────────────────────────────
  const handlePreviewConfirm = async (confirmedFields) => {
    setPreview(null);
    const savedProfileFields = profileFields;
    setProfileFields({});
    setBusy(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

      const profileMapped = confirmedFields.filter(f => f._mapping && f._mapping !== 'ai');
      const aiFields      = confirmedFields.filter(f => !f._mapping || f._mapping === 'ai');

      // Inject profile-mapped fields directly
      if (profileMapped.length) {
        const fills = profileMapped.map(f => ({ id: f.id, value: savedProfileFields[f._mapping] ?? '' }));
        await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
        addMsg('system', `Filled ${fills.length} field${fills.length > 1 ? 's' : ''} from your profile.`);
      }

      // Send AI-delegated fields with skipPreview to bypass confidence re-check
      if (aiFields.length) {
        const cleanFields = aiFields.map(({ _mapping, ...rest }) => rest);
        const res = await chrome.runtime.sendMessage({
          type:        MSG.FILL_FORM,
          domain,
          pageTitle:   tab?.title ?? '',
          fields:      cleanFields,
          templateId:  DEFAULT_TEMPLATE_ID,
          skipPreview: true,
        });
        if (res?.error) {
          addMsg('error', res.error.message);
        } else {
          if (res?.staticFields?.length) {
            const fills = res.staticFields.map(f => ({ id: f.id, value: f.value }));
            await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
          }
          if (res?.aiValues && Object.keys(res.aiValues).length) {
            const fills = Object.entries(res.aiValues).map(([id, value]) => ({ id, value }));
            await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_FIELDS', fills });
          }
          addMsg('system', 'Remaining fields sent to AI.');
        }
      }

      if (!profileMapped.length && !aiFields.length) {
        addMsg('system', 'No fields confirmed.');
      }
    } catch (err) {
      addMsg('error', err.message);
    }
    setBusy(false);
  };

  // ── Consent response ───────────────────────────────────────────────────────
  const handleConsent = (approved) => {
    window.dispatchEvent(new CustomEvent('ai-ext:consent-response', {
      detail: { id: consent.id, approved },
    }));
    setConsent(null);
  };

  return (
    <>
      {/* Message list */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role === 'error' ? 'error' : m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant'}`}>
            {m.content}
          </div>
        ))}
        {streaming && (
          <div className="msg msg--assistant streaming-cursor">{streaming}</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="chip" onClick={handleFillForm} disabled={busy}>Fill form</button>
        <button className="chip" onClick={() => setPreview({ previewOnly: true })} disabled={busy}>Preview prompt</button>
        <button className="chip" onClick={() => addMsg('system', 'Save info coming soon')} disabled={busy}>Save info</button>
      </div>

      {/* Input */}
      <div className="input-row">
        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything or type / for commands…"
          disabled={busy}
        />
        <button className="btn" onClick={handleSend} disabled={busy || !input.trim()}>Send</button>
      </div>

      {/* Prompt preview modal */}
      {preview && (
        <PromptPreview
          data={preview}
          profileFields={profileFields}
          onConfirm={handlePreviewConfirm}
          onCancel={() => { setPreview(null); setProfileFields({}); }}
        />
      )}

      {/* Consent toast */}
      {consent && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__title">Save this info?</div>
            <p className="text-small text-muted">
              Save <strong>{consent.field}</strong> to your profile for future use?
            </p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => handleConsent(false)}>Skip</button>
              <button className="btn"            onClick={() => handleConsent(true)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

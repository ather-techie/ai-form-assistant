import { useState, useEffect } from 'react';
import { MSG, DEFAULT_TEMPLATE_ID } from '../../shared/constants.js';

export default function ProfilePanel() {
  const [templates,   setTemplates]   = useState([]);
  const [activeId,    setActiveId]    = useState(DEFAULT_TEMPLATE_ID);
  const [profile,     setProfile]     = useState({ name: 'Default', fields: {} });
  const [editField,   setEditField]   = useState('');
  const [editValue,   setEditValue]   = useState('');
  const [newName,     setNewName]     = useState('');
  const [showNew,     setShowNew]     = useState(false);

  const load = async (id = activeId) => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: id });
    if (res?.profile)   setProfile(res.profile);
    if (res?.templates) setTemplates(res.templates);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editField.trim()) return;
    await chrome.runtime.sendMessage({
      type: MSG.SAVE_FIELD,
      field:      editField.trim(),
      value:      editValue,
      domain:     '*',
      templateId: activeId,
      source:     'manual',
    });
    setEditField(''); setEditValue('');
    load();
  };

  const handleDeleteField = async (key) => {
    const updated = { ...profile.fields };
    delete updated[key];
    // Re-save the full profile without the deleted key
    await chrome.runtime.sendMessage({
      type: MSG.SAVE_FIELD, field: `__delete__${key}`, value: '', domain: '*', templateId: activeId, source: 'delete',
    });
    load();
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    const id = `tpl_${Date.now()}`;
    const updated = [...templates, { id, name: newName.trim(), createdAt: Date.now() }];
    // Save via settings message (simplified — service worker handles template index)
    await chrome.runtime.sendMessage({ type: MSG.UPDATE_SETTINGS, settings: { __templates: updated } });
    setNewName(''); setShowNew(false);
    setActiveId(id);
    load(id);
  };

  const fields = Object.entries(profile.fields);

  return (
    <div>
      {/* Template selector */}
      <div className="row row--between" style={{ marginBottom: 12 }}>
        <select
          value={activeId}
          onChange={e => { setActiveId(e.target.value); load(e.target.value); }}
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        >
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn btn--ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setShowNew(v => !v)}>+ Template</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="field-group">
            <label>Template name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Job Application" />
          </div>
          <div className="row">
            <button className="btn" onClick={handleCreateTemplate}>Create</button>
            <button className="btn btn--ghost" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Saved fields */}
      <div className="card__title">Saved fields ({fields.length})</div>
      {fields.length === 0 && <p className="text-muted text-small" style={{ marginTop: 6 }}>No saved fields yet. Add one below or fill a form and save values.</p>}

      {fields.map(([key, val]) => (
        <div key={key} className="card" style={{ padding: '8px 12px' }}>
          <div className="row row--between">
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{key}</span>
              <span className="text-muted text-small" style={{ marginLeft: 8 }}>{String(val).slice(0, 40)}{String(val).length > 40 ? '…' : ''}</span>
            </div>
            <button className="btn btn--ghost btn--danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => handleDeleteField(key)}>✕</button>
          </div>
        </div>
      ))}

      <hr className="divider" />

      {/* Add field manually */}
      <div className="card__title" style={{ marginBottom: 8 }}>Add field</div>
      <div className="field-group">
        <label>Field name</label>
        <input value={editField} onChange={e => setEditField(e.target.value)} placeholder="e.g. email" />
      </div>
      <div className="field-group">
        <label>Value</label>
        <input value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="e.g. you@example.com" />
      </div>
      <button className="btn" onClick={handleSave} disabled={!editField.trim()}>Save field</button>
    </div>
  );
}

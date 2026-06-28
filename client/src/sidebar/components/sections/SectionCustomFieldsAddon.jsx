import { useState } from 'react';
import { labelToKey } from './profileFieldConfigs.js';

export default function SectionCustomFieldsAddon({ sectionId, customMeta = [], values, onChange, onAddField, onDeleteField }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = `${sectionId}__${labelToKey(label)}`;
    if (customMeta.some(f => f.key === key)) return;
    onAddField({ key, label });
    setNewLabel('');
    setShowAdd(false);
  };

  return (
    <>
      {customMeta.map(({ key, label }) => (
        <div className="field-group" key={key}>
          <div className="row row--between" style={{ marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>{label}</label>
            <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => onDeleteField(key)}>✕</button>
          </div>
          <textarea value={values[key] ?? ''} onChange={e => onChange(key, e.target.value)} rows={2} placeholder={`Enter ${label.toLowerCase()}…`} />
        </div>
      ))}

      {showAdd ? (
        <div className="card" style={{ padding: '10px 12px', marginBottom: 8 }}>
          <div className="field-group" style={{ marginBottom: 8 }}>
            <label>Field label</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Preferred Topics"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          {newLabel.trim() && (
            <p className="text-muted text-small" style={{ marginBottom: 8 }}>
              Stored as: <code>{sectionId}__{labelToKey(newLabel.trim())}</code>
            </p>
          )}
          <div className="row">
            <button className="btn" onClick={handleAdd}>Add</button>
            <button className="btn btn--ghost" onClick={() => { setShowAdd(false); setNewLabel(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn--ghost" style={{ fontSize: 12, width: '100%', marginBottom: 8 }} onClick={() => setShowAdd(true)}>
          + Add Field
        </button>
      )}
    </>
  );
}

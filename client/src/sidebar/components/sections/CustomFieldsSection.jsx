import { useState } from 'react';
import { sectionHeaderStyle, labelToKey } from './profileFieldConfigs.js';

export default function CustomFieldsSection({ isOpen, onToggle, customFieldsMeta, values, onChange, onAddField, onDeleteField, saving, saved, onSave, onReset }) {
  const [showAddField,  setShowAddField]  = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const handleAddCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const key = labelToKey(label);
    if (customFieldsMeta.some(f => f.key === key)) return;
    onAddField({ key, label });
    setNewFieldLabel('');
    setShowAddField(false);
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Custom Fields</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          <p className="text-muted text-small" style={{ marginBottom: 10 }}>
            Add fields specific to your work — e.g. judging criteria, mentoring focus, speaking topics.
          </p>

          {customFieldsMeta.map(({ key, label }) => (
            <div className="field-group" key={key}>
              <div className="row row--between" style={{ marginBottom: 4 }}>
                <label style={{ marginBottom: 0 }}>{label}</label>
                <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => onDeleteField(key)}>✕</button>
              </div>
              <textarea value={values[key] ?? ''} onChange={e => onChange(key, e.target.value)} rows={2} placeholder={`Enter ${label.toLowerCase()}…`} />
            </div>
          ))}

          {showAddField ? (
            <div className="card" style={{ padding: '10px 12px', marginBottom: 8 }}>
              <div className="field-group" style={{ marginBottom: 8 }}>
                <label>Field label</label>
                <input
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="e.g. Judging Criteria"
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomField()}
                  autoFocus
                />
              </div>
              {newFieldLabel.trim() && (
                <p className="text-muted text-small" style={{ marginBottom: 8 }}>
                  Stored as: <code>{labelToKey(newFieldLabel.trim())}</code>
                </p>
              )}
              <div className="row">
                <button className="btn" onClick={handleAddCustomField}>Add</button>
                <button className="btn btn--ghost" onClick={() => { setShowAddField(false); setNewFieldLabel(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn--ghost" style={{ fontSize: 12, width: '100%', marginBottom: 8 }} onClick={() => setShowAddField(true)}>
              + Add Field
            </button>
          )}

          <div className="row" style={{ marginTop: 4, gap: 6 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onReset} disabled={saving}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

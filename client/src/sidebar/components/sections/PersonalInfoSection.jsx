import { useState } from 'react';
import { PERSONAL_FIELDS, sectionHeaderStyle } from './profileFieldConfigs.js';
import SectionCustomFieldsAddon from './SectionCustomFieldsAddon.jsx';

export default function PersonalInfoSection({ isOpen, onToggle, values, onChange, saving, saved, onSave, onReset, customMeta = [], onAddCustomField, onDeleteCustomField }) {
  const [visibleFields, setVisibleFields] = useState(new Set());

  function toggleVisibility(key) {
    setVisibleFields(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Personal Info</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {PERSONAL_FIELDS.map(f => (
            <div className="field-group" key={f.key}>
              <label>{f.label}</label>
              {f.options
                ? <select value={values[f.key] ?? ''} onChange={e => onChange(f.key, e.target.value)}>
                    {f.options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                  </select>
                : f.multiline
                  ? <textarea value={values[f.key] ?? ''} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
                  : f.sensitive
                    ? <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          style={{ flex: 1 }}
                          type={visibleFields.has(f.key) ? 'text' : 'password'}
                          value={values[f.key] ?? ''}
                          onChange={e => onChange(f.key, e.target.value)}
                          placeholder={f.placeholder}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{ padding: '0 8px', fontSize: 11 }}
                          onClick={() => toggleVisibility(f.key)}
                        >
                          {visibleFields.has(f.key) ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    : <input value={values[f.key] ?? ''} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} />
              }
            </div>
          ))}
          <SectionCustomFieldsAddon sectionId="personal" customMeta={customMeta} values={values} onChange={onChange} onAddField={onAddCustomField} onDeleteField={onDeleteCustomField} />
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

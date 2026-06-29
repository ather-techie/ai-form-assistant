import { SCHOLARSHIP_FIELDS, sectionHeaderStyle } from './profileFieldConfigs.js';
import SectionCustomFieldsAddon from './SectionCustomFieldsAddon.jsx';

export default function ScholarshipSection({ isOpen, onToggle, values, onChange, saving, saved, onSave, onReset, customMeta = [], onAddCustomField, onDeleteCustomField }) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Scholarship / Study Application</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {SCHOLARSHIP_FIELDS.map(f => (
            <div className="field-group" key={f.key}>
              <label>{f.label}</label>
              {f.options
                ? (
                  <select value={values[f.key] ?? ''} onChange={e => onChange(f.key, e.target.value)}>
                    {f.options.map(o => <option key={o} value={o}>{o || '— select —'}</option>)}
                  </select>
                )
                : f.multiline
                ? (
                  <textarea
                    value={values[f.key] ?? ''}
                    onChange={e => onChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                )
                : (
                  <input
                    value={values[f.key] ?? ''}
                    onChange={e => onChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )
              }
            </div>
          ))}
          <SectionCustomFieldsAddon sectionId="scholarship" customMeta={customMeta} values={values} onChange={onChange} onAddField={onAddCustomField} onDeleteField={onDeleteCustomField} />
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <button className="btn" onClick={onSave} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
            <button className="btn btn--ghost" onClick={onReset} style={{ flex: 1 }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { PERSONAL_FIELDS, sectionHeaderStyle } from './profileFieldConfigs.js';

export default function PersonalInfoSection({ isOpen, onToggle, values, onChange, saving, saved, onSave, onReset }) {
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
                  : <input    value={values[f.key] ?? ''} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} />
              }
            </div>
          ))}
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

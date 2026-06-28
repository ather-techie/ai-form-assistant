import { PROFESSIONAL_ACCOUNTS_FIELDS, sectionHeaderStyle } from './profileFieldConfigs.js';
import SectionCustomFieldsAddon from './SectionCustomFieldsAddon.jsx';

export default function ProfessionalAccountsSection({ isOpen, onToggle, values, onChange, saving, saved, onSave, onReset, customMeta = [], onAddCustomField, onDeleteCustomField }) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Professional Accounts</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {PROFESSIONAL_ACCOUNTS_FIELDS.map(f => (
            <div className="field-group" key={f.key}>
              <label>{f.label}</label>
              <input
                value={values[f.key] ?? ''}
                onChange={e => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <SectionCustomFieldsAddon sectionId="professionalAccounts" customMeta={customMeta} values={values} onChange={onChange} onAddField={onAddCustomField} onDeleteField={onDeleteCustomField} />
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

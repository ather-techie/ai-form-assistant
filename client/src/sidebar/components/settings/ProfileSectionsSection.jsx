import { sectionHeaderStyle } from '../sections/profileFieldConfigs.js';

const checkboxStyle = { accentColor: 'var(--accent)', width: 16, height: 16 };

const SECTION_FLAGS = [
  { key: 'personalSection',           label: 'Personal info section' },
  { key: 'employmentSection',         label: 'Employment info section' },
  { key: 'educationSection',          label: 'Education section' },
  { key: 'customFieldsSection',       label: 'Custom fields section' },
  { key: 'judgingSection',            label: 'Judging section' },
  { key: 'mentoringSection',          label: 'Mentoring section' },
  { key: 'speakerSection',            label: 'Speaker section' },
  { key: 'scholarshipSection',        label: 'Scholarship / Study Application section' },
  { key: 'professionalAccountsSection', label: 'Professional Accounts section' },
];

export default function ProfileSectionsSection({ features, onFeatureChange, isOpen, onToggle }) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Profile Sections</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {SECTION_FLAGS.map(({ key, label }, i) => (
            <div
              key={key}
              className="row row--between"
              style={{ marginBottom: i === SECTION_FLAGS.length - 1 ? 0 : 10 }}
            >
              <label style={{ fontSize: 13 }}>{label}</label>
              <input
                type="checkbox"
                checked={features?.[key] ?? true}
                onChange={e => onFeatureChange(key, e.target.checked)}
                style={checkboxStyle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

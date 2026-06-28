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

export default function ProfileSectionsSection({ features, onFeatureChange }) {
  return (
    <>
      <div className="card__title" style={{ marginBottom: 12 }}>Profile Sections</div>

      {SECTION_FLAGS.map(({ key, label }, i) => (
        <div
          key={key}
          className="row row--between"
          style={{ marginBottom: i === SECTION_FLAGS.length - 1 ? 16 : 10 }}
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
    </>
  );
}

import { useState } from 'react';
import { CONFIDENCE } from '../../shared/constants.js';
import { PROFILE_FIELD_SECTIONS } from './sections/profileFieldConfigs.js';

export default function PromptPreview({ data, profileFields = {}, onConfirm, onCancel }) {
  const allFields = [
    ...(data.previewFields ?? []),
    ...(data.smartFields   ?? []),
  ];
  const [included, setIncluded] = useState(
    () => Object.fromEntries(allFields.map(f => [f.id, true]))
  );
  const [mappings, setMappings] = useState(
    () => Object.fromEntries(allFields.map(f => [f.id, 'ai']))
  );

  const toggle = id => setIncluded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleConfirm = () => {
    const confirmed = allFields.filter(f => included[f.id]).map(f => ({
      ...f,
      _mapping: mappings[f.id] ?? 'ai',
    }));
    onConfirm(confirmed);
  };

  const lowCount = allFields.filter(f => f.confidence < CONFIDENCE.THRESHOLD).length;

  const populatedProfileOptions = PROFILE_FIELD_SECTIONS.flatMap(section =>
    section.fields
      .filter(f => profileFields[f.key])
      .map(f => ({ key: f.key, label: f.label, section: section.label }))
  );

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__title">Review before sending to AI</div>

        {lowCount > 0 && (
          <div className="card card--warn" style={{ marginBottom: 12 }}>
            <span className="badge-warn">⚠ {lowCount} uncertain field{lowCount > 1 ? 's' : ''}</span>
            <p className="text-small text-muted" style={{ marginTop: 6 }}>
              These fields could not be identified with confidence. Map them to a profile field or let AI decide.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {allFields.map(f => {
            const isLow     = f.confidence < CONFIDENCE.THRESHOLD;
            const isChecked = included[f.id] ?? true;
            return (
              <div key={f.id}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(f.id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{f.label}</strong>
                    <span className="text-muted" style={{ fontSize: 11, marginLeft: 6 }}>
                      ({f.classification})
                    </span>
                  </span>
                  {isLow && <span className="badge-warn">low</span>}
                </label>
                <select
                  className="mapping-select"
                  disabled={!isChecked}
                  value={mappings[f.id] ?? 'ai'}
                  onChange={e => setMappings(prev => ({ ...prev, [f.id]: e.target.value }))}
                >
                  <option value="ai">Let AI decide</option>
                  {PROFILE_FIELD_SECTIONS.map(section => {
                    const opts = populatedProfileOptions.filter(o => o.section === section.label);
                    if (!opts.length) return null;
                    return (
                      <optgroup key={section.label} label={section.label}>
                        {opts.map(o => (
                          <option key={o.key} value={o.key}>
                            {section.label}: {o.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={handleConfirm}
            disabled={!allFields.some(f => included[f.id])}>
            Send to AI
          </button>
        </div>
      </div>
    </div>
  );
}

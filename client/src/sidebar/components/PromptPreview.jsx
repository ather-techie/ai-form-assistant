import { useState } from 'react';
import { CONFIDENCE } from '../../shared/constants.js';

/**
 * PromptPreview — shows assembled fields before AI submission.
 * Mandatory when low-confidence fields are present.
 * User can remove individual fields or cancel entirely.
 */
export default function PromptPreview({ data, onConfirm, onCancel }) {
  const allFields = [
    ...(data.previewFields ?? []),
    ...(data.smartFields   ?? []),
  ];
  const [included, setIncluded] = useState(
    () => Object.fromEntries(allFields.map(f => [f.id, true]))
  );

  const toggle = id => setIncluded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleConfirm = () => {
    const confirmed = allFields.filter(f => included[f.id]);
    onConfirm(confirmed);
  };

  const lowCount = allFields.filter(f => f.confidence < CONFIDENCE.THRESHOLD).length;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__title">Review before sending to AI</div>

        {lowCount > 0 && (
          <div className="card card--warn" style={{ marginBottom: 12 }}>
            <span className="badge-warn">⚠ {lowCount} uncertain field{lowCount > 1 ? 's' : ''}</span>
            <p className="text-small text-muted" style={{ marginTop: 6 }}>
              These fields could not be identified with confidence. Review them before sending.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {allFields.map(f => (
            <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={included[f.id] ?? true}
                onChange={() => toggle(f.id)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ flex: 1 }}>
                <strong style={{ fontSize: 13 }}>{f.label}</strong>
                <span className="text-muted" style={{ fontSize: 11, marginLeft: 6 }}>
                  ({f.classification})
                </span>
              </span>
              {f.confidence < CONFIDENCE.THRESHOLD && (
                <span className="badge-warn">low</span>
              )}
            </label>
          ))}
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

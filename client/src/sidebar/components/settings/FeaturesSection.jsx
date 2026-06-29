import { sectionHeaderStyle } from '../sections/profileFieldConfigs.js';

const checkboxStyle = { accentColor: 'var(--accent)', width: 16, height: 16 };

export default function FeaturesSection({ features, onFeatureChange, isOpen, onToggle }) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Features</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          <div className="row row--between" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13 }}>Show cost badge</label>
            <input type="checkbox" checked={features?.costBadge ?? true} onChange={e => onFeatureChange('costBadge', e.target.checked)} style={checkboxStyle} />
          </div>

          <div className="row row--between" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13 }}>Documents section</label>
            <input type="checkbox" checked={features?.documentsSection ?? true} onChange={e => onFeatureChange('documentsSection', e.target.checked)} style={checkboxStyle} />
          </div>

          <div className="row row--between" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13 }}>Audit panel</label>
            <input type="checkbox" checked={features?.auditPanel ?? true} onChange={e => onFeatureChange('auditPanel', e.target.checked)} style={checkboxStyle} />
          </div>

          <div className="row row--between" style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 13 }}>Attach docs when filling</label>
            <input type="checkbox" checked={features?.attachmentFilling ?? false} onChange={e => onFeatureChange('attachmentFilling', e.target.checked)} style={checkboxStyle} />
          </div>
          <p className="text-muted text-small" style={{ marginBottom: 10 }}>
            Sends your raw resume and uploaded files to the AI when filling forms. Increases token usage and cost.
          </p>

          <div className="row row--between" style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 13 }}>Trace form fill</label>
            <input type="checkbox" checked={features?.traceFormFill ?? false} onChange={e => onFeatureChange('traceFormFill', e.target.checked)} style={checkboxStyle} />
          </div>
          <p className="text-muted text-small" style={{ marginBottom: 0 }}>
            Log detailed fill events to Audit → Trace for debugging field matching and injection issues.
          </p>
        </div>
      )}
    </div>
  );
}

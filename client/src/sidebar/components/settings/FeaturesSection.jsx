const checkboxStyle = { accentColor: 'var(--accent)', width: 16, height: 16 };

export default function FeaturesSection({ features, onFeatureChange }) {
  return (
    <>
      <div className="card__title" style={{ marginBottom: 12 }}>Features</div>

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
    </>
  );
}

export default function PrivacySection({ clearing, cleared, onClearAll }) {
  return (
    <>
      <hr className="divider" />
      <div className="card__title" style={{ marginBottom: 8 }}>Privacy</div>
      <p className="text-muted text-small" style={{ marginBottom: 10 }}>
        Clears all saved settings, profiles, token history, and consent logs from this device.
      </p>
      <button
        className="btn btn--ghost btn--danger"
        onClick={onClearAll}
        disabled={clearing}
        style={{ width: '100%' }}
      >
        {cleared ? '✓ Cleared' : clearing ? 'Clearing…' : 'Clear all data'}
      </button>
    </>
  );
}

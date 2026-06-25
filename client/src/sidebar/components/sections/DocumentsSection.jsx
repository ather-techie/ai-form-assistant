import { useRef } from 'react';
import { sectionHeaderStyle } from './profileFieldConfigs.js';

const readFileAsText = (file, onDone) => {
  const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml)$/i.test(file.name);
  const isPdf  = /\.pdf$/i.test(file.name);
  const isWord = /\.docx?$/i.test(file.name);

  if (isText) {
    const reader = new FileReader();
    reader.onload = ev => onDone({ name: file.name, content: ev.target.result });
    reader.readAsText(file);
  } else if (isPdf || isWord) {
    const mime = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const reader = new FileReader();
    reader.onload = ev => {
      const bytes = new Uint8Array(ev.target.result);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      onDone({ name: file.name, content: `data:${mime};base64,${b64}` });
    };
    reader.readAsArrayBuffer(file);
  } else {
    onDone({ name: file.name, content: '' });
  }
};

export default function DocumentsSection({ isOpen, onToggle, resumeFile, onResumeChange, customFiles, onCustomFilesChange, saving, saved, onSave, onReset }) {
  const resumeInputRef = useRef();
  const customInputRef = useRef();

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) readFileAsText(file, onResumeChange);
    e.target.value = '';
  };

  const handleCustomUpload = (e) => {
    Array.from(e.target.files).forEach(file =>
      readFileAsText(file, f => onCustomFilesChange([...customFiles, f]))
    );
    e.target.value = '';
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 8 }}>
      <button style={sectionHeaderStyle} onClick={onToggle}>
        <span>Documents</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>

          {/* Resume */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Resume</div>
            {resumeFile ? (
              <div className="card" style={{ padding: '8px 12px', marginBottom: 8 }}>
                <div className="row row--between">
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    📄 {resumeFile.name}
                  </span>
                  <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }} onClick={() => onResumeChange(null)}>✕</button>
                </div>
                {resumeFile.content === '' && (
                  <p className="text-muted text-small" style={{ marginTop: 6 }}>Unsupported file type — text could not be extracted.</p>
                )}
              </div>
            ) : (
              <p className="text-muted text-small" style={{ marginBottom: 8 }}>No resume uploaded. PDF, Word (.docx), .txt, and .md files are supported.</p>
            )}
            <input type="file" ref={resumeInputRef} style={{ display: 'none' }} accept=".txt,.md,.pdf,.doc,.docx" onChange={handleResumeUpload} />
            <button className="btn btn--ghost" style={{ fontSize: 12, width: '100%' }} onClick={() => resumeInputRef.current?.click()}>
              {resumeFile ? 'Replace Resume' : 'Upload Resume'}
            </button>
          </div>

          {/* Custom files */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Custom Files</div>
            {customFiles.length === 0 && (
              <p className="text-muted text-small" style={{ marginBottom: 8 }}>No custom files added.</p>
            )}
            {customFiles.map((f, i) => (
              <div key={i} className="card" style={{ padding: '8px 12px', marginBottom: 6 }}>
                <div className="row row--between">
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    📎 {f.name}
                  </span>
                  <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }} onClick={() => onCustomFilesChange(customFiles.filter((_, j) => j !== i))}>✕</button>
                </div>
              </div>
            ))}
            <input type="file" ref={customInputRef} style={{ display: 'none' }} accept=".txt,.md,.pdf,.doc,.docx,.csv,.json" multiple onChange={handleCustomUpload} />
            <button className="btn btn--ghost" style={{ fontSize: 12, width: '100%' }} onClick={() => customInputRef.current?.click()}>
              + Add File
            </button>
          </div>

          <div className="row" style={{ gap: 6 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onSave} disabled={!!saving}>
              {saving === 'extracting' ? 'Filling…' : saving ? 'Saving…' : saved ? '✓ Saved' : 'Save and Fill'}
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

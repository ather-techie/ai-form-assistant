import { useState, useEffect, useRef } from 'react';
import { MSG, DEFAULT_TEMPLATE_ID } from '../../shared/constants.js';

const PERSONAL_FIELDS = [
  { key: 'firstName',  label: 'First Name',  placeholder: 'John' },
  { key: 'lastName',   label: 'Last Name',   placeholder: 'Doe' },
  { key: 'email',      label: 'Email',       placeholder: 'john@example.com' },
  { key: 'phone',      label: 'Phone',       placeholder: '+1 555-000-0000' },
  { key: 'address',    label: 'Address',     placeholder: '123 Main St' },
  { key: 'city',       label: 'City',        placeholder: 'New York' },
  { key: 'state',      label: 'State',       placeholder: 'NY' },
  { key: 'zip',        label: 'ZIP Code',    placeholder: '10001' },
  { key: 'country',    label: 'Country',     placeholder: 'United States' },
];

const EMPLOYEE_FIELDS = [
  { key: 'jobTitle',        label: 'Job Title',           placeholder: 'Software Engineer' },
  { key: 'company',         label: 'Current Company',     placeholder: 'Acme Corp' },
  { key: 'yearsExperience', label: 'Years of Experience', placeholder: '5' },
  { key: 'linkedin',        label: 'LinkedIn URL',        placeholder: 'https://linkedin.com/in/you' },
  { key: 'portfolio',       label: 'Portfolio / Website', placeholder: 'https://yoursite.com' },
  { key: 'skills',          label: 'Skills',              placeholder: 'JavaScript, React, Node.js', multiline: true },
  { key: 'coverLetter',     label: 'Cover Letter',        placeholder: 'I am a passionate...', multiline: true },
];

const EDUCATION_FIELDS = [
  { key: 'degree',         label: 'Degree',             placeholder: 'Bachelor of Science' },
  { key: 'fieldOfStudy',   label: 'Field of Study',     placeholder: 'Computer Science' },
  { key: 'school',         label: 'School / University', placeholder: 'State University' },
  { key: 'graduationYear', label: 'Graduation Year',    placeholder: '2020' },
  { key: 'gpa',            label: 'GPA',                placeholder: '3.8' },
];

const sectionHeaderStyle = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

export default function ProfilePanel() {
  const [templates, setTemplates] = useState([]);
  const [activeId,  setActiveId]  = useState(DEFAULT_TEMPLATE_ID);
  const [values,    setValues]    = useState({});
  const [open,      setOpen]      = useState({ personal: true, employment: false, education: false, documents: false });
  const [saving,    setSaving]    = useState({});
  const [saved,     setSaved]     = useState({});
  const [showNew,   setShowNew]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [resumeFile,   setResumeFile]   = useState(null);
  const [customFiles,  setCustomFiles]  = useState([]);
  const resumeInputRef = useRef();
  const customInputRef = useRef();

  const load = async (id = activeId) => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: id });
    if (res?.profile) {
      const f = res.profile.fields ?? {};
      setValues(f);
      setResumeFile(f.resume_filename ? { name: f.resume_filename, content: f.resume_content ?? '' } : null);
      try { setCustomFiles(f.custom_files ? JSON.parse(f.custom_files) : []); } catch { setCustomFiles([]); }
    }
    if (res?.templates) setTemplates(res.templates);
  };

  useEffect(() => { load(); }, []);

  const setValue = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const markSaved = (sectionId) => {
    setSaving(s => ({ ...s, [sectionId]: false }));
    setSaved(s => ({ ...s, [sectionId]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [sectionId]: false })), 2000);
  };

  const saveSection = async (sectionId, fields) => {
    setSaving(s => ({ ...s, [sectionId]: true }));
    for (const f of fields) {
      await chrome.runtime.sendMessage({
        type: MSG.SAVE_FIELD, field: f.key, value: values[f.key] ?? '',
        domain: '*', templateId: activeId, source: 'manual',
      });
    }
    markSaved(sectionId);
  };

  const saveDocuments = async () => {
    setSaving(s => ({ ...s, documents: true }));
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_filename', value: resumeFile?.name ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_content',  value: resumeFile?.content ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'custom_files',    value: JSON.stringify(customFiles), domain: '*', templateId: activeId, source: 'manual' });
    markSaved('documents');
  };

  const readFileAsText = (file, onDone) => {
    const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = ev => onDone({ name: file.name, content: ev.target.result });
      reader.readAsText(file);
    } else {
      onDone({ name: file.name, content: '' });
    }
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) readFileAsText(file, setResumeFile);
    e.target.value = '';
  };

  const handleCustomUpload = (e) => {
    Array.from(e.target.files).forEach(file =>
      readFileAsText(file, f => setCustomFiles(cf => [...cf, f]))
    );
    e.target.value = '';
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    const id = `tpl_${Date.now()}`;
    const updated = [...templates, { id, name: newName.trim(), createdAt: Date.now() }];
    await chrome.runtime.sendMessage({ type: MSG.UPDATE_SETTINGS, settings: { __templates: updated } });
    setNewName(''); setShowNew(false);
    setActiveId(id);
    load(id);
  };

  const renderSection = (sectionId, title, fields) => {
    const isOpen   = open[sectionId];
    const isSaving = saving[sectionId];
    const isSaved  = saved[sectionId];
    return (
      <div key={sectionId} className="card" style={{ padding: 0, marginBottom: 8 }}>
        <button style={sectionHeaderStyle} onClick={() => setOpen(o => ({ ...o, [sectionId]: !o[sectionId] }))}>
          <span>{title}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
        </button>
        {isOpen && (
          <div style={{ padding: '0 12px 12px' }}>
            {fields.map(f => (
              <div className="field-group" key={f.key}>
                <label>{f.label}</label>
                {f.multiline
                  ? <textarea value={values[f.key] ?? ''} onChange={e => setValue(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
                  : <input    value={values[f.key] ?? ''} onChange={e => setValue(f.key, e.target.value)} placeholder={f.placeholder} />
                }
              </div>
            ))}
            <button className="btn" style={{ width: '100%', marginTop: 4 }} onClick={() => saveSection(sectionId, fields)} disabled={isSaving}>
              {isSaving ? 'Saving…' : isSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Template selector */}
      <div className="row row--between" style={{ marginBottom: 12 }}>
        <select
          value={activeId}
          onChange={e => { setActiveId(e.target.value); load(e.target.value); }}
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
        >
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn btn--ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setShowNew(v => !v)}>+ Template</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="field-group">
            <label>Template name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Job Application" />
          </div>
          <div className="row">
            <button className="btn" onClick={handleCreateTemplate}>Create</button>
            <button className="btn btn--ghost" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {renderSection('personal',   'Personal Info',  PERSONAL_FIELDS)}
      {renderSection('employment', 'Employee Info',  EMPLOYEE_FIELDS)}
      {renderSection('education',  'Education Info', EDUCATION_FIELDS)}

      {/* Documents section */}
      <div className="card" style={{ padding: 0, marginBottom: 8 }}>
        <button style={sectionHeaderStyle} onClick={() => setOpen(o => ({ ...o, documents: !o.documents }))}>
          <span>Documents</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{open.documents ? '▼' : '▶'}</span>
        </button>
        {open.documents && (
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
                    <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }} onClick={() => setResumeFile(null)}>✕</button>
                  </div>
                  {!resumeFile.content && (
                    <p className="text-muted text-small" style={{ marginTop: 6 }}>Binary file — text content not extracted.</p>
                  )}
                </div>
              ) : (
                <p className="text-muted text-small" style={{ marginBottom: 8 }}>No resume uploaded. .txt and .md files will have their content read.</p>
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
                    <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }} onClick={() => setCustomFiles(cf => cf.filter((_, j) => j !== i))}>✕</button>
                  </div>
                </div>
              ))}
              <input type="file" ref={customInputRef} style={{ display: 'none' }} accept=".txt,.md,.pdf,.doc,.docx,.csv,.json" multiple onChange={handleCustomUpload} />
              <button className="btn btn--ghost" style={{ fontSize: 12, width: '100%' }} onClick={() => customInputRef.current?.click()}>
                + Add File
              </button>
            </div>

            <button className="btn" style={{ width: '100%' }} onClick={saveDocuments} disabled={saving.documents}>
              {saving.documents ? 'Saving…' : saved.documents ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

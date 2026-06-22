import { useState, useEffect } from 'react';
import { MSG, DEFAULT_TEMPLATE_ID } from '../../shared/constants.js';
import { PERSONAL_FIELDS, EMPLOYEE_FIELDS, EDUCATION_FIELDS } from './sections/profileFieldConfigs.js';
import PersonalInfoSection   from './sections/PersonalInfoSection.jsx';
import EmployeeInfoSection   from './sections/EmployeeInfoSection.jsx';
import EducationInfoSection  from './sections/EducationInfoSection.jsx';
import DocumentsSection      from './sections/DocumentsSection.jsx';
import CustomFieldsSection   from './sections/CustomFieldsSection.jsx';

export default function ProfilePanel() {
  const [templates, setTemplates] = useState([]);
  const [activeId,  setActiveId]  = useState(DEFAULT_TEMPLATE_ID);
  const [values,    setValues]    = useState({});
  const [open,      setOpen]      = useState({ personal: false, employment: false, education: false, documents: true, custom: false });
  const [saving,    setSaving]    = useState({});
  const [saved,     setSaved]     = useState({});
  const [showNew,   setShowNew]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [resumeFile,        setResumeFile]        = useState(null);
  const [customFiles,       setCustomFiles]       = useState([]);
  const [customFieldsMeta,  setCustomFieldsMeta]  = useState([]);
  const [showResetConfirm,  setShowResetConfirm]  = useState(false);

  const load = async (id = activeId) => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: id });
    if (res?.profile) {
      const f = res.profile.fields ?? {};
      setValues(f);
      setResumeFile(f.resume_filename ? { name: f.resume_filename, content: f.resume_content ?? '' } : null);
      try { setCustomFiles(f.custom_files ? JSON.parse(f.custom_files) : []); } catch { setCustomFiles([]); }
      try { setCustomFieldsMeta(f._custom_fields_meta ? JSON.parse(f._custom_fields_meta) : []); } catch { setCustomFieldsMeta([]); }
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

  const resetSection = (fields) => {
    setValues(v => {
      const next = { ...v };
      fields.forEach(f => { next[f.key] = ''; });
      return next;
    });
  };

  const handleGlobalReset = () => {
    setValues({});
    setResumeFile(null);
    setCustomFiles([]);
    setCustomFieldsMeta([]);
    setShowResetConfirm(false);
  };

  const saveDocuments = async () => {
    setSaving(s => ({ ...s, documents: true }));
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_filename', value: resumeFile?.name ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_content',  value: resumeFile?.content ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'custom_files',    value: JSON.stringify(customFiles), domain: '*', templateId: activeId, source: 'manual' });

    setSaving(s => ({ ...s, documents: 'extracting' }));
    try {
      const result = await chrome.runtime.sendMessage({ type: MSG.EXTRACT_FROM_DOCUMENT, templateId: activeId });
      const extracted = Object.fromEntries(
        Object.entries(result?.fields ?? {}).filter(([, v]) => v !== null && v !== '')
      );
      if (Object.keys(extracted).length > 0) {
        setValues(prev => ({ ...prev, ...extracted }));
        setOpen(o => ({ ...o, personal: true, employment: true, education: true }));
      }
    } catch { /* extraction failure is non-fatal — documents are already saved */ }

    markSaved('documents');
  };

  const saveCustomFields = async () => {
    setSaving(s => ({ ...s, custom: true }));
    await chrome.runtime.sendMessage({
      type: MSG.SAVE_FIELD, field: '_custom_fields_meta', value: JSON.stringify(customFieldsMeta),
      domain: '*', templateId: activeId, source: 'manual',
    });
    for (const { key } of customFieldsMeta) {
      await chrome.runtime.sendMessage({
        type: MSG.SAVE_FIELD, field: key, value: values[key] ?? '',
        domain: '*', templateId: activeId, source: 'manual',
      });
    }
    markSaved('custom');
  };

  const handleDeleteCustomField = async (key) => {
    setCustomFieldsMeta(m => m.filter(f => f.key !== key));
    setValues(v => { const n = { ...v }; delete n[key]; return n; });
    await chrome.runtime.sendMessage({
      type: MSG.SAVE_FIELD, field: `__delete__${key}`, value: '',
      domain: '*', templateId: activeId, source: 'manual',
    });
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

  const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));

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

      <div style={{ marginBottom: 10, textAlign: 'right' }}>
        <button
          className="btn btn--ghost"
          style={{ fontSize: 12, padding: '4px 10px', color: 'var(--error, #e74c3c)', borderColor: 'var(--error, #e74c3c)' }}
          onClick={() => setShowResetConfirm(true)}
        >
          Reset All
        </button>
      </div>

      {showResetConfirm && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--error, #e74c3c)', padding: '12px 14px' }}>
          <p style={{ fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
            This will clear <strong>all fields, files, and custom entries</strong> for this template. This cannot be undone.
          </p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" style={{ flex: 1, background: 'var(--error, #e74c3c)', borderColor: 'var(--error, #e74c3c)' }} onClick={handleGlobalReset}>
              Yes, Reset Everything
            </button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setShowResetConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

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

      <DocumentsSection
        isOpen={open.documents} onToggle={() => toggle('documents')}
        resumeFile={resumeFile} onResumeChange={setResumeFile}
        customFiles={customFiles} onCustomFilesChange={setCustomFiles}
        saving={saving.documents} saved={saved.documents}
        onSave={saveDocuments} onReset={() => { setResumeFile(null); setCustomFiles([]); }}
      />

      <PersonalInfoSection
        isOpen={open.personal} onToggle={() => toggle('personal')}
        values={values} onChange={setValue}
        saving={saving.personal} saved={saved.personal}
        onSave={() => saveSection('personal', PERSONAL_FIELDS)}
        onReset={() => resetSection(PERSONAL_FIELDS)}
      />

      <EmployeeInfoSection
        isOpen={open.employment} onToggle={() => toggle('employment')}
        values={values} onChange={setValue}
        saving={saving.employment} saved={saved.employment}
        onSave={() => saveSection('employment', EMPLOYEE_FIELDS)}
        onReset={() => resetSection(EMPLOYEE_FIELDS)}
      />

      <EducationInfoSection
        isOpen={open.education} onToggle={() => toggle('education')}
        values={values} onChange={setValue}
        saving={saving.education} saved={saved.education}
        onSave={() => saveSection('education', EDUCATION_FIELDS)}
        onReset={() => resetSection(EDUCATION_FIELDS)}
      />

      <CustomFieldsSection
        isOpen={open.custom} onToggle={() => toggle('custom')}
        customFieldsMeta={customFieldsMeta} values={values} onChange={setValue}
        onAddField={({ key, label }) => { setCustomFieldsMeta(m => [...m, { key, label }]); setValue(key, ''); }}
        onDeleteField={handleDeleteCustomField}
        saving={saving.custom} saved={saved.custom}
        onSave={saveCustomFields} onReset={() => resetSection(customFieldsMeta)}
      />
    </div>
  );
}

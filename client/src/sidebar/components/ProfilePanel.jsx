import { useState, useEffect } from 'react';
import { MSG, DEFAULT_TEMPLATE_ID } from '../../shared/constants.js';
import { useFeatureFlags } from '../hooks/useFeatureFlags.js';
import { PERSONAL_FIELDS, EMPLOYEE_FIELDS, EDUCATION_FIELDS, JUDGING_FIELDS, MENTORING_FIELDS, SPEAKER_FIELDS, SCHOLARSHIP_FIELDS, PROFESSIONAL_ACCOUNTS_FIELDS } from './sections/profileFieldConfigs.js';
import PersonalInfoSection   from './sections/PersonalInfoSection.jsx';
import EmployeeInfoSection   from './sections/EmployeeInfoSection.jsx';
import EducationInfoSection  from './sections/EducationInfoSection.jsx';
import DocumentsSection      from './sections/DocumentsSection.jsx';
import CustomFieldsSection   from './sections/CustomFieldsSection.jsx';
import JudgingSection        from './sections/JudgingSection.jsx';
import MentoringSection      from './sections/MentoringSection.jsx';
import SpeakerSection        from './sections/SpeakerSection.jsx';
import ScholarshipSection          from './sections/ScholarshipSection.jsx';
import ProfessionalAccountsSection from './sections/ProfessionalAccountsSection.jsx';

const FIELD_LABELS = Object.fromEntries(
  [...PERSONAL_FIELDS, ...EMPLOYEE_FIELDS, ...EDUCATION_FIELDS, ...JUDGING_FIELDS, ...MENTORING_FIELDS, ...SPEAKER_FIELDS, ...PROFESSIONAL_ACCOUNTS_FIELDS].map(f => [f.key, f.label])
);

export default function ProfilePanel() {
  const flags = useFeatureFlags();
  const [templates, setTemplates] = useState([]);
  const [activeId,  setActiveId]  = useState(DEFAULT_TEMPLATE_ID);
  const [values,    setValues]    = useState({});
  const [open,      setOpen]      = useState({ personal: false, employment: false, education: false, documents: true, custom: false, judging: false, mentoring: false, speaker: false, scholarship: false, professionalAccounts: false });
  const [saving,    setSaving]    = useState({});
  const [saved,     setSaved]     = useState({});
  const [showNew,   setShowNew]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [resumeFile,        setResumeFile]        = useState(null);
  const [customFiles,       setCustomFiles]       = useState([]);
  const [customFieldsMeta,  setCustomFieldsMeta]  = useState([]);
  const [sectionCustomMeta, setSectionCustomMeta] = useState({ personal: [], employment: [], education: [], judging: [], mentoring: [], speaker: [], scholarship: [], professionalAccounts: [] });
  const [showResetConfirm,  setShowResetConfirm]  = useState(false);
  const [pendingExtract,    setPendingExtract]    = useState(null); // { key: newValue } | null
  const [extractSel,        setExtractSel]        = useState({});   // { key: bool } selection

  const load = async (id = activeId) => {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_PROFILE, templateId: id });
    if (res?.profile) {
      const f = res.profile.fields ?? {};
      setValues(f);
      setResumeFile(f.resume_filename ? { name: f.resume_filename, content: f.resume_content ?? '' } : null);
      try { setCustomFiles(f.custom_files ? JSON.parse(f.custom_files) : []); } catch { setCustomFiles([]); }
      try { setCustomFieldsMeta(f._custom_fields_meta ? JSON.parse(f._custom_fields_meta) : []); } catch { setCustomFieldsMeta([]); }
      const SECTION_IDS = ['personal', 'employment', 'education', 'judging', 'mentoring', 'speaker', 'scholarship', 'professionalAccounts'];
      const scm = {};
      for (const sid of SECTION_IDS) {
        try { scm[sid] = f[`_${sid}_custom_meta`] ? JSON.parse(f[`_${sid}_custom_meta`]) : []; } catch { scm[sid] = []; }
      }
      setSectionCustomMeta(scm);
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
    const meta = sectionCustomMeta[sectionId] ?? [];
    await chrome.runtime.sendMessage({
      type: MSG.SAVE_FIELD, field: `_${sectionId}_custom_meta`, value: JSON.stringify(meta),
      domain: '*', templateId: activeId, source: 'manual',
    });
    for (const { key } of meta) {
      await chrome.runtime.sendMessage({
        type: MSG.SAVE_FIELD, field: key, value: values[key] ?? '',
        domain: '*', templateId: activeId, source: 'manual',
      });
    }
    markSaved(sectionId);
  };

  const resetSection = (fields, sectionId) => {
    setValues(v => {
      const next = { ...v };
      fields.forEach(f => { next[f.key] = ''; });
      if (sectionId) {
        (sectionCustomMeta[sectionId] ?? []).forEach(f => { next[f.key] = ''; });
      }
      return next;
    });
  };

  const handleGlobalReset = () => {
    setValues({});
    setResumeFile(null);
    setCustomFiles([]);
    setCustomFieldsMeta([]);
    setSectionCustomMeta({ personal: [], employment: [], education: [], judging: [], mentoring: [], speaker: [], scholarship: [], professionalAccounts: [] });
    setShowResetConfirm(false);
  };

  const saveDocuments = async () => {
    if (!flags.documentsSection) return;
    setSaving(s => ({ ...s, documents: true }));
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_filename', value: resumeFile?.name ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'resume_content',  value: resumeFile?.content ?? '', domain: '*', templateId: activeId, source: 'manual' });
    await chrome.runtime.sendMessage({ type: MSG.SAVE_FIELD, field: 'custom_files',    value: JSON.stringify(customFiles), domain: '*', templateId: activeId, source: 'manual' });

    setSaving(s => ({ ...s, documents: 'extracting' }));
    try {
      const result = await chrome.runtime.sendMessage({ type: MSG.EXTRACT_FROM_DOCUMENT, templateId: activeId });
      const extracted = Object.fromEntries(
        Object.entries(result?.fields ?? {}).filter(([k, v]) => v !== null && v !== '' && k in FIELD_LABELS)
      );
      if (Object.keys(extracted).length > 0) {
        // Stage extracted values for user review before overwriting anything.
        setPendingExtract(extracted);
        setExtractSel(Object.fromEntries(Object.keys(extracted).map(k => [k, true])));
      }
    } catch { /* extraction failure is non-fatal — documents are already saved */ }

    markSaved('documents');
  };

  const applyExtract = async () => {
    const chosen = Object.entries(pendingExtract).filter(([k]) => extractSel[k]);
    setValues(prev => ({ ...prev, ...Object.fromEntries(chosen) }));
    for (const [field, value] of chosen) {
      await chrome.runtime.sendMessage({
        type: MSG.SAVE_FIELD, field, value, domain: '*', templateId: activeId, source: 'document',
      });
    }
    setOpen(o => ({ ...o, personal: true, employment: true, education: true }));
    setPendingExtract(null);
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

  const handleDeleteSectionCustomField = async (sectionId, key) => {
    setSectionCustomMeta(m => ({ ...m, [sectionId]: m[sectionId].filter(f => f.key !== key) }));
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

      {pendingExtract && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--accent, #4a90d9)', padding: '12px 14px' }}>
          <p style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)', fontWeight: 600 }}>
            Review extracted information
          </p>
          <p className="text-muted text-small" style={{ marginBottom: 10 }}>
            Uncheck any field you want to keep as-is. Highlighted rows will overwrite existing data.
          </p>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
            {Object.entries(pendingExtract).map(([key, newVal]) => {
              const current     = values[key] ?? '';
              const isOverwrite = current !== '' && current !== newVal;
              return (
                <label
                  key={key}
                  className="row"
                  style={{
                    gap: 8, alignItems: 'flex-start', padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                    cursor: 'pointer',
                    background: isOverwrite ? 'var(--warn-bg, rgba(240,180,40,0.12))' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!extractSel[key]}
                    onChange={e => setExtractSel(s => ({ ...s, [key]: e.target.checked }))}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {FIELD_LABELS[key] ?? key}
                      {isOverwrite && <span className="text-muted text-small" style={{ fontWeight: 400 }}> · overwrites</span>}
                    </div>
                    <div className="text-small" style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                      <span style={{ textDecoration: isOverwrite ? 'line-through' : 'none' }}>
                        {current === '' ? 'empty' : current}
                      </span>
                      {' → '}
                      <span style={{ color: 'var(--text)' }}>{newVal}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              disabled={!Object.values(extractSel).some(Boolean)}
              onClick={applyExtract}
            >
              Apply Selected
            </button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setPendingExtract(null)}>
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

      {flags.documentsSection && (
        <DocumentsSection
          isOpen={open.documents} onToggle={() => toggle('documents')}
          resumeFile={resumeFile} onResumeChange={setResumeFile}
          customFiles={customFiles} onCustomFilesChange={setCustomFiles}
          saving={saving.documents} saved={saved.documents}
          onSave={saveDocuments} onReset={() => { setResumeFile(null); setCustomFiles([]); }}
        />
      )}

      {flags.personalSection && (
        <PersonalInfoSection
          isOpen={open.personal} onToggle={() => toggle('personal')}
          values={values} onChange={setValue}
          saving={saving.personal} saved={saved.personal}
          onSave={() => saveSection('personal', PERSONAL_FIELDS)}
          onReset={() => resetSection(PERSONAL_FIELDS, 'personal')}
          customMeta={sectionCustomMeta.personal}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, personal: [...m.personal, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('personal', key)}
        />
      )}

      {flags.employmentSection && (
        <EmployeeInfoSection
          isOpen={open.employment} onToggle={() => toggle('employment')}
          values={values} onChange={setValue}
          saving={saving.employment} saved={saved.employment}
          onSave={() => saveSection('employment', EMPLOYEE_FIELDS)}
          onReset={() => resetSection(EMPLOYEE_FIELDS, 'employment')}
          customMeta={sectionCustomMeta.employment}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, employment: [...m.employment, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('employment', key)}
        />
      )}

      {flags.educationSection && (
        <EducationInfoSection
          isOpen={open.education} onToggle={() => toggle('education')}
          values={values} onChange={setValue}
          saving={saving.education} saved={saved.education}
          onSave={() => saveSection('education', EDUCATION_FIELDS)}
          onReset={() => resetSection(EDUCATION_FIELDS, 'education')}
          customMeta={sectionCustomMeta.education}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, education: [...m.education, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('education', key)}
        />
      )}

      {flags.customFieldsSection && (
        <CustomFieldsSection
          isOpen={open.custom} onToggle={() => toggle('custom')}
          customFieldsMeta={customFieldsMeta} values={values} onChange={setValue}
          onAddField={({ key, label }) => { setCustomFieldsMeta(m => [...m, { key, label }]); setValue(key, ''); }}
          onDeleteField={handleDeleteCustomField}
          saving={saving.custom} saved={saved.custom}
          onSave={saveCustomFields} onReset={() => resetSection(customFieldsMeta)}
        />
      )}

      {flags.judgingSection && (
        <JudgingSection
          isOpen={open.judging} onToggle={() => toggle('judging')}
          values={values} onChange={setValue}
          saving={saving.judging} saved={saved.judging}
          onSave={() => saveSection('judging', JUDGING_FIELDS)}
          onReset={() => resetSection(JUDGING_FIELDS, 'judging')}
          customMeta={sectionCustomMeta.judging}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, judging: [...m.judging, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('judging', key)}
        />
      )}

      {flags.mentoringSection && (
        <MentoringSection
          isOpen={open.mentoring} onToggle={() => toggle('mentoring')}
          values={values} onChange={setValue}
          saving={saving.mentoring} saved={saved.mentoring}
          onSave={() => saveSection('mentoring', MENTORING_FIELDS)}
          onReset={() => resetSection(MENTORING_FIELDS, 'mentoring')}
          customMeta={sectionCustomMeta.mentoring}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, mentoring: [...m.mentoring, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('mentoring', key)}
        />
      )}

      {flags.speakerSection && (
        <SpeakerSection
          isOpen={open.speaker} onToggle={() => toggle('speaker')}
          values={values} onChange={setValue}
          saving={saving.speaker} saved={saved.speaker}
          onSave={() => saveSection('speaker', SPEAKER_FIELDS)}
          onReset={() => resetSection(SPEAKER_FIELDS, 'speaker')}
          customMeta={sectionCustomMeta.speaker}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, speaker: [...m.speaker, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('speaker', key)}
        />
      )}

      {flags.scholarshipSection && (
        <ScholarshipSection
          isOpen={open.scholarship} onToggle={() => toggle('scholarship')}
          values={values} onChange={setValue}
          saving={saving.scholarship} saved={saved.scholarship}
          onSave={() => saveSection('scholarship', SCHOLARSHIP_FIELDS)}
          onReset={() => resetSection(SCHOLARSHIP_FIELDS, 'scholarship')}
          customMeta={sectionCustomMeta.scholarship}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, scholarship: [...m.scholarship, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('scholarship', key)}
        />
      )}

      {flags.professionalAccountsSection && (
        <ProfessionalAccountsSection
          isOpen={open.professionalAccounts} onToggle={() => toggle('professionalAccounts')}
          values={values} onChange={setValue}
          saving={saving.professionalAccounts} saved={saved.professionalAccounts}
          onSave={() => saveSection('professionalAccounts', PROFESSIONAL_ACCOUNTS_FIELDS)}
          onReset={() => resetSection(PROFESSIONAL_ACCOUNTS_FIELDS, 'professionalAccounts')}
          customMeta={sectionCustomMeta.professionalAccounts}
          onAddCustomField={({ key, label }) => { setSectionCustomMeta(m => ({ ...m, professionalAccounts: [...m.professionalAccounts, { key, label }] })); setValue(key, ''); }}
          onDeleteCustomField={(key) => handleDeleteSectionCustomField('professionalAccounts', key)}
        />
      )}
    </div>
  );
}

export const PERSONAL_FIELDS = [
  { key: 'firstName',  label: 'First Name',  placeholder: 'John' },
  { key: 'lastName',   label: 'Last Name',   placeholder: 'Doe' },
  { key: 'pronouns',   label: 'Pronouns',    options: ['', 'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'ze/zir', 'xe/xem', 'prefer not to say'] },
  { key: 'email',      label: 'Email',       placeholder: 'john@example.com' },
  { key: 'phone',      label: 'Phone',       placeholder: '+1 555-000-0000' },
  { key: 'website',    label: 'Website',     placeholder: 'https://yoursite.com' },
  { key: 'address',    label: 'Address',     placeholder: '123 Main St' },
  { key: 'city',       label: 'City',        placeholder: 'New York' },
  { key: 'state',       label: 'State',        placeholder: 'Florida' },
  { key: 'stateCode',   label: 'State Code',   placeholder: 'FL' },
  { key: 'zip',         label: 'ZIP Code',     placeholder: '10001' },
  { key: 'country',     label: 'Country',      placeholder: 'United States' },
  { key: 'countryCode', label: 'Country Code', placeholder: 'USA' },
  { key: 'bio',        label: 'Bio / About', placeholder: 'A short bio about yourself…', multiline: true },
  { key: 'password',   label: 'Password',    placeholder: '••••••••', sensitive: true },
];

export const EMPLOYEE_FIELDS = [
  { key: 'jobTitle',        label: 'Job Title',           placeholder: 'Software Engineer' },
  { key: 'company',         label: 'Current Company',     placeholder: 'Acme Corp' },
  { key: 'yearsExperience', label: 'Years of Experience', placeholder: '5' },
  { key: 'linkedin',        label: 'LinkedIn URL',        placeholder: 'https://linkedin.com/in/you' },
  { key: 'portfolio',       label: 'Portfolio / Website', placeholder: 'https://yoursite.com' },
  { key: 'skills',          label: 'Skills',              placeholder: 'JavaScript, React, Node.js', multiline: true },
  { key: 'coverLetter',     label: 'Cover Letter',        placeholder: 'I am a passionate...', multiline: true },
];

export const EDUCATION_FIELDS = [
  { key: 'degree',         label: 'Degree',              placeholder: 'Bachelor of Science' },
  { key: 'fieldOfStudy',   label: 'Field of Study',      placeholder: 'Computer Science' },
  { key: 'school',         label: 'School / University', placeholder: 'State University' },
  { key: 'graduationYear', label: 'Graduation Year',     placeholder: '2020' },
  { key: 'gpa',            label: 'GPA',                 placeholder: '3.8' },
];

export const JUDGING_FIELDS = [
  { key: 'judgingRole',         label: 'Role',           placeholder: 'Judge / Panel Lead' },
  { key: 'judgingOrganization', label: 'Organization',   placeholder: 'MLH, Devpost, IEEE…' },
  { key: 'judgingDomain',       label: 'Domain / Focus', placeholder: 'AI/ML, Healthcare…' },
  { key: 'judgingYear',         label: 'Year(s)',         placeholder: '2024' },
  { key: 'judgingWebsite',      label: 'Event Website',  placeholder: 'https://…' },
  { key: 'judgingNotes',        label: 'Notes',          placeholder: 'Additional context…', multiline: true },
];

export const MENTORING_FIELDS = [
  { key: 'mentoringRole',         label: 'Role',           placeholder: 'Mentor / Coach / Advisor' },
  { key: 'mentoringOrganization', label: 'Organization',   placeholder: 'ADPList, MentorCruise…' },
  { key: 'mentoringFocus',        label: 'Focus / Topics', placeholder: 'Career, JavaScript, System Design…' },
  { key: 'mentoringAvailability', label: 'Availability',   placeholder: 'Bi-weekly 30 min' },
  { key: 'mentoringWebsite',      label: 'Profile URL',    placeholder: 'https://…' },
  { key: 'mentoringBio',          label: 'Mentoring Bio',  placeholder: 'What you offer as a mentor…', multiline: true },
];

export const SPEAKER_FIELDS = [
  { key: 'speakerTopics',  label: 'Topics',          placeholder: 'AI, DevOps, Leadership…', multiline: true },
  { key: 'speakerEvents',  label: 'Past Events',     placeholder: 'JSConf 2023, re:Invent…', multiline: true },
  { key: 'speakerBio',     label: 'Speaker Bio',     placeholder: 'Third-person bio for event programmes…', multiline: true },
  { key: 'speakerFee',     label: 'Honorarium',      placeholder: 'Negotiable / $X / volunteer' },
  { key: 'speakerWebsite', label: 'Speaker Page',    placeholder: 'https://…' },
  { key: 'speakerVideo',   label: 'Sample Talk URL', placeholder: 'https://youtube.com/…' },
];

export const SCHOLARSHIP_FIELDS = [
  { key: 'scholarshipName',   label: 'Scholarship Name',            placeholder: 'Gates Scholarship, Fulbright…' },
  { key: 'scholarshipOrg',    label: 'Awarding Organization',       placeholder: 'Foundation / government agency' },
  { key: 'targetInstitution', label: 'Target School / Institution', placeholder: 'University of Michigan' },
  { key: 'fieldOfStudy',      label: 'Field of Study / Major',      placeholder: 'Computer Science, Nursing…' },
  { key: 'academicLevel',     label: 'Academic Level',              options: ['', 'High School', 'Undergraduate', 'Graduate', 'Doctoral', 'Professional / Certificate'] },
  { key: 'gpa',               label: 'GPA / Academic Standing',     placeholder: '3.8 / 4.0, top 10%…' },
  { key: 'personalStatement', label: 'Personal Statement',          placeholder: 'Summarize your goals and motivation…', multiline: true },
  { key: 'financialNeed',     label: 'Financial Need Statement',    placeholder: 'Describe your financial circumstances…', multiline: true },
  { key: 'extracurriculars',  label: 'Extracurricular Activities',  placeholder: 'Clubs, sports, volunteer work…', multiline: true },
  { key: 'references',        label: 'References / Recommenders',   placeholder: 'Dr. Jane Smith, Prof. of Biology…', multiline: true },
];

export const PROFESSIONAL_ACCOUNTS_FIELDS = [
  { key: 'linkedinUrl',  label: 'LinkedIn',           placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'twitterUrl',   label: 'Twitter / X',         placeholder: 'https://twitter.com/yourhandle' },
  { key: 'githubUrl',    label: 'GitHub',              placeholder: 'https://github.com/yourhandle' },
  { key: 'instagramUrl', label: 'Instagram',           placeholder: 'https://instagram.com/yourhandle' },
  { key: 'youtubeUrl',   label: 'YouTube',             placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'portfolioUrl', label: 'Website / Portfolio', placeholder: 'https://yoursite.com' },
];

export const PROFILE_FIELD_SECTIONS = [
  { label: 'Personal',               fields: PERSONAL_FIELDS },
  { label: 'Professional',           fields: EMPLOYEE_FIELDS },
  { label: 'Education',              fields: EDUCATION_FIELDS },
  { label: 'Judging',                fields: JUDGING_FIELDS },
  { label: 'Mentoring',              fields: MENTORING_FIELDS },
  { label: 'Speaker',                fields: SPEAKER_FIELDS },
  { label: 'Scholarship',            fields: SCHOLARSHIP_FIELDS },
  { label: 'Professional Accounts',  fields: PROFESSIONAL_ACCOUNTS_FIELDS },
];

export const labelToKey = (label) =>
  label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export const sectionHeaderStyle = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

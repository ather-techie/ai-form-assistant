export const PERSONAL_FIELDS = [
  { key: 'firstName',  label: 'First Name',  placeholder: 'John' },
  { key: 'lastName',   label: 'Last Name',   placeholder: 'Doe' },
  { key: 'pronouns',   label: 'Pronouns',    options: ['', 'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'ze/zir', 'xe/xem', 'prefer not to say'] },
  { key: 'email',      label: 'Email',       placeholder: 'john@example.com' },
  { key: 'phone',      label: 'Phone',       placeholder: '+1 555-000-0000' },
  { key: 'website',    label: 'Website',     placeholder: 'https://yoursite.com' },
  { key: 'address',    label: 'Address',     placeholder: '123 Main St' },
  { key: 'city',       label: 'City',        placeholder: 'New York' },
  { key: 'state',      label: 'State',       placeholder: 'NY' },
  { key: 'zip',        label: 'ZIP Code',    placeholder: '10001' },
  { key: 'country',    label: 'Country',     placeholder: 'United States' },
  { key: 'bio',        label: 'Bio / About', placeholder: 'A short bio about yourself…', multiline: true },
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

export const sectionHeaderStyle = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

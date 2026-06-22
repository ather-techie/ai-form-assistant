import { Router } from 'express';
import { MOCK, ENV_KEYS } from '../config.js';
import { buildNonStreamingRequest, extractNonStreamingText } from '../lib/requestBuilder.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth  from 'mammoth';

async function decodeContent(content) {
  if (content.startsWith('data:application/pdf;base64,')) {
    const buf = Buffer.from(content.slice(content.indexOf(',') + 1), 'base64');
    const result = await pdfParse(buf);
    return result.text;
  }
  if (content.startsWith('data:application/vnd.openxmlformats') ||
      content.startsWith('data:application/msword')) {
    const buf = Buffer.from(content.slice(content.indexOf(',') + 1), 'base64');
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }
  return content;
}

const router = Router();

const EXTRACT_FIELDS = [
  'firstName','lastName','pronouns','email','phone','website',
  'address','city','state','zip','country','bio',
  'jobTitle','company','yearsExperience','linkedin','portfolio','skills','coverLetter',
  'degree','fieldOfStudy','school','graduationYear','gpa',
];

router.post('/v1/extract', async (req, res) => {
  const { provider, model, apiKey: bodyKey, content } = req.body;

  if (!provider || !content) {
    return res.status(400).json({ error: 'provider and content are required.' });
  }

  if (MOCK) {
    return res.json({
      fields: {
        firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com',
        phone: '+1 555-123-4567', jobTitle: 'Software Engineer',
        company: 'Acme Corp', skills: 'JavaScript, React, Node.js',
        bio: 'Experienced full-stack developer.',
        ...Object.fromEntries(
          EXTRACT_FIELDS
            .filter(k => !['firstName','lastName','email','phone','jobTitle','company','skills','bio'].includes(k))
            .map(k => [k, null])
        ),
      },
    });
  }

  const apiKey = bodyKey || ENV_KEYS[provider] || null;
  if (!apiKey && provider !== 'local') {
    return res.status(401).json({ error: 'No API key provided.' });
  }

  let textContent;
  try {
    textContent = await decodeContent(content);
  } catch (err) {
    return res.status(422).json({ error: `Could not extract text from document: ${err.message}` });
  }
  if (!textContent.trim()) {
    return res.status(400).json({ error: 'Could not extract text from document.' });
  }

  const prompt = `Extract profile information from the document below. Return ONLY a valid JSON object with exactly these keys (use null for any field not found in the document): ${EXTRACT_FIELDS.join(', ')}. Do not include any explanation or markdown — return the raw JSON object only.\n\nDocument:\n${textContent}`;
  const messages = [{ role: 'user', content: prompt }];

  try {
    const { url, headers, body } = buildNonStreamingRequest(provider, model, messages, apiKey);
    const upstream = await fetch(url, { method: 'POST', headers, body });

    if (!upstream.ok) {
      return res.status(502).json({ error: `Provider returned ${upstream.status}.` });
    }

    const data = await upstream.json();
    const text = extractNonStreamingText(data, provider);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let fields = {};
    if (jsonMatch) {
      try { fields = JSON.parse(jsonMatch[0]); } catch { /* leave empty */ }
    }

    return res.json({ fields });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'Internal error.' });
  }
});

export default router;

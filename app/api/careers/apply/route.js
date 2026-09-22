// A job application from /careers → `job_apply`, with the résumé stored in
// Vercel Blob (public/uploads/resume without a Blob token). Every file gets a
// random name, so an address cannot be guessed from another.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDbEnabled } from '@/lib/db';
import { createApplication } from '@/lib/sql/careers';
import { blobEnabled, putPublic } from '@/lib/blob';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

// Vercel turns away any request above 4.5 MB before it reaches us.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const DIR = path.join(process.cwd(), 'public', 'uploads', 'resume');

async function storeResume(file) {
  const ext = TYPES[file.type];
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  if (blobEnabled()) {
    const saved = await putPublic(`careers/resume/${name}`, body, file.type);
    return saved.url;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, name), body);
  return `/uploads/resume/${name}`;
}

export async function POST(request) {
  if (!isDbEnabled()) return fail('Applications cannot be taken online right now. Please email your CV.', 503);

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid request. If your CV is larger than 4 MB, please email it instead.');
  }

  // A field people never see; bots that fill every field are quietly dropped.
  if (String(form.get('website') || '').trim()) return Response.json({ ok: true });

  const name = normaliseName(form.get('name'));
  if (!name) return fail('Enter your full name.');
  const email = normaliseEmail(form.get('email'));
  if (!email) return fail('Enter a valid email address.');
  const phone = normaliseMobile(form.get('phone'));
  if (!phone) return fail('Enter a valid 10-digit mobile number.');
  const city = String(form.get('city') || '').trim().slice(0, 50);
  if (!city) return fail('Enter your city.');
  const message = String(form.get('message') || '').trim().slice(0, 5000);

  const file = form.get('resume');
  let resume = '';
  if (file && typeof file === 'object' && file.size) {
    if (!TYPES[file.type]) return fail('Attach your CV as a PDF, Word file or photo.');
    if (file.size > MAX_BYTES) return fail('The CV must be 4 MB or smaller.');
    try {
      resume = await storeResume(file);
    } catch (err) {
      console.error('[careers] could not store the CV:', err.message);
      return fail('Could not upload your CV. Please try again, or email it to us.', 502);
    }
  }

  try {
    const saved = await createApplication({
      jobId: form.get('jobId'), name, email, phone, city, message, resume,
    });
    if (saved.error) return fail(saved.error);
  } catch (err) {
    console.error('[careers] could not save the application:', err.message);
    return fail('Could not send your application. Please try again.', 502);
  }

  return Response.json({ ok: true });
}

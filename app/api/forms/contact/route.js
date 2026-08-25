// The contact form → `contact_message`, plus the site's existing mailer.

import { isDbEnabled } from '@/lib/db';
import { createContactMessage, notifyByEmail } from '@/lib/sql/forms';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Please call +91-9311587716 — we cannot take the message online right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = normaliseName(body.name);
  if (!name) return fail('Enter your full name.');

  const email = normaliseEmail(body.email);
  if (!email) return fail('Enter a valid email address.');

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const message = String(body.message ?? '').trim();
  if (message.length < 5) return fail('Please tell us how we can help.');

  const subject = String(body.enquiry_type ?? '').trim() || 'Website enquiry';

  try {
    await createContactMessage({
      name,
      email,
      subject,
      // The table has no phone column, so the number goes in the message where
      // whoever replies will see it.
      message: `${message}\n\nMobile: ${mobile}`,
    });
  } catch (err) {
    console.error('[contact] could not save the message:', err.message);
    return fail('Could not send your message. Please call +91-9311587716.', 502);
  }

  // Mailed afterwards so a mail problem never loses the message.
  await notifyByEmail('contact', {
    enquiry_type: subject, name, email, mobile, message, go_back: '',
  });

  return Response.json({ ok: true });
}

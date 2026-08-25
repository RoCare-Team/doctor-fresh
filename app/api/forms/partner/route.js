// A dealer / distributor / C&F application.
//
// The PHP site only emails these (email_partner.php) — there is no table for
// them, and `vendor` is a fuller registration that needs a password and
// documents. So the application is recorded in `contact_message`, where the
// team already reads enquiries, and the same email still goes out.

import { isDbEnabled } from '@/lib/db';
import { createContactMessage, notifyByEmail } from '@/lib/sql/forms';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Please call +91-9311587716 — we cannot take the application online right now.', 503);

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

  const subject = String(body.enquiry_type ?? '').trim() || 'Become A Partner';

  const details = [
    ['Business', body.business],
    ['Investment capacity', body.investment_capacity],
    ['Education', body.education],
    ['State', body.state],
    ['City', body.city],
    ['Address', body.address],
    ['Mobile', mobile],
  ]
    .filter(([, v]) => String(v ?? '').trim())
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join('\n');

  try {
    await createContactMessage({ name, email, subject, message: details });
  } catch (err) {
    console.error('[partner] could not save the application:', err.message);
    return fail('Could not send your application. Please call +91-9311587716.', 502);
  }

  await notifyByEmail('partner', {
    enquiry_type: subject,
    name,
    email,
    mobile,
    business: body.business ?? '',
    investment_capacity: body.investment_capacity ?? '',
    education: body.education ?? '',
    state: body.state ?? '',
    city: body.city ?? '',
    address: body.address ?? '',
    go_back: '',
    submit: '1',
  });

  return Response.json({ ok: true });
}

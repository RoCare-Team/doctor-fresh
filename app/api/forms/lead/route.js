// A service booking / enquiry from a landing page → the `leads` table.

import { isDbEnabled } from '@/lib/db';
import { createLead } from '@/lib/sql/forms';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Please call +91-9311587716 — we cannot take the request online right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = normaliseName(body.name);
  if (!name) return fail('Enter your full name.');

  // The booking form calls it `mobile`, the water-test form `number` — both
  // are the same enquiry and land in the same table.
  const mobile = normaliseMobile(body.mobile ?? body.number);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const email = normaliseEmail(body.email);
  if (email === null) return fail('Enter a valid email address.');

  try {
    await createLead({
      pageId: body.pageId,
      name,
      email: email || '',
      mobile,
      roStatus: body.roStatus,
      queryFor: body.queryFor || body.enquiry_type,
      state: body.state,
      city: body.city,
      unit: body.unit,
      bookDate: body.bookDate,
      address: body.address || body.message,
    });
  } catch (err) {
    console.error('[lead] could not save the enquiry:', err.message);
    return fail('Could not send your request. Please call +91-9311587716.', 502);
  }

  return Response.json({ ok: true });
}

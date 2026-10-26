// A service booking / enquiry from a landing page → the `leads` table.
//
// The "Book RO Service in <city>" form (form: "service-booking") also goes to
// the service centre's lead system — the same AddLead endpoint the "Submit
// your request" wizard files to — so the booking reaches the team that
// visits. That copy is best-effort: the enquiry is already saved here.

import { isDbEnabled } from '@/lib/db';
import { after } from 'next/server';
import { createLead } from '@/lib/sql/forms';
import { submitLead } from '@/lib/wizard';
import { notifyTeam } from '@/lib/whatsapp';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

/** What their wizard calls the service: 1 installation, 3 AMC, 2 repair / service. */
const serviceType = (text) => {
  const t = String(text || '').toLowerCase();
  if (/install/.test(t)) return '1';
  if (/amc|annual/.test(t)) return '3';
  return '2';
};

/** The booking, filed with the service centre as a water purifier service request. */
async function fileWithServiceCentre({ name, mobile, email, body }) {
  try {
    await submitLead({
      name,
      mobile,
      email,
      leadType: process.env.SERVICE_LEAD_TYPE || '1',
      state: String(body.state || ''),
      city: String(body.city || ''),
      area: String(body.address || '').slice(0, 200),
      complainType: '2',
      serviceType: serviceType(body.queryFor),
      domesticOrCommercial: '1',
    }, { otp: false });
  } catch (err) {
    console.error('[lead] could not file with the service centre:', err.message);
  }
}

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

  if (body.form === 'service-booking') {
    after(() => fileWithServiceCentre({ name, mobile, email: email || '', body }));
  }

  after(() => notifyTeam({
    what: 'Website enquiry',
    name,
    mobile,
    email: email || '',
    detail: [body.queryFor || body.enquiry_type, body.city, body.state]
      .filter(Boolean).join(' · ').slice(0, 60),
  }));

  return Response.json({ ok: true });
}

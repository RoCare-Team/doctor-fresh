// "Submit your Request" → the same lead system the current site posts to.

import { submitLead, needsOtp } from '@/lib/wizard';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = normaliseName(body.name);
  if (!name) return fail('Please enter your name.');

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Please enter a valid 10-digit mobile number.');

  const email = normaliseEmail(body.email);
  if (email === null) return fail('Please enter a valid email address.');

  if (!String(body.leadType || '').trim()) return fail('Please select a category.');
  if (!String(body.state || '').trim()) return fail('Please select a state.');
  if (!String(body.city || '').trim()) return fail('Please select a city.');

  const pincode = String(body.pincode || '').trim();
  if (pincode && !/^\d{6}$/.test(pincode)) return fail('Please enter a valid 6-digit pin code.');

  const fields = { ...body, name, mobile, email: email || '', pincode };

  // A service request is verified by a code their system texts, the way their
  // own form does it; a new purchase is filed straight away.
  const otp = needsOtp(fields);

  let data;
  try {
    data = await submitLead(fields, { otp });
  } catch (err) {
    console.error('[wizard] could not send the request:', err.message);
    return fail('Could not send your request. Please call +91-9311587716.', 502);
  }

  // Their "you already have an open request in this category": the enquiry is
  // with them, so there is nothing to verify and nothing to apologise for.
  const alreadyOpen = Number(data?.status) === 2;

  return Response.json({
    ok: true,
    otpRequired: otp && !alreadyOpen,
    alreadyOpen,
  });
}

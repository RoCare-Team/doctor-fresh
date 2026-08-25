// Books a service visit through the RO Care service system.

import { createBooking } from '@/lib/services/wizard';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';
import { SITE_URL } from '@/lib/utils';

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
  if (!name) return fail('Enter your full name.');

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const email = normaliseEmail(body.email);
  if (email === null) return fail('Enter a valid email address.');

  const pincode = String(body.pincode ?? '').trim();
  if (!/^\d{6}$/.test(pincode)) return fail('Enter a valid 6-digit pin code.');

  for (const [field, label] of [['houseNo', 'your house or flat number'], ['area', 'your area'], ['city', 'your city'], ['state', 'your state']]) {
    if (!String(body[field] ?? '').trim()) return fail(`Please enter ${label}.`);
  }

  const result = await createBooking({
    name,
    mobile,
    email: email || '',
    pincode,
    houseNo: body.houseNo,
    area: body.area,
    nearBy: body.nearBy,
    state: body.state,
    city: body.city,
    serviceGroup: body.serviceGroup,
    premises: body.premises,
    siteUrl: `${SITE_URL}${body.path || '/water-purifier-service'}`,
  });

  if (!result.ok) return fail(result.reason, 502);

  return Response.json({ ok: true, reference: result.reference });
}

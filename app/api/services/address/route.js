// The addresses a booking can be sent to, and adding a new one.
//
// The list is everything we know about where this customer is: what the OTP
// service handed over at sign-in, the visits already booked on their number,
// and the addresses their orders were delivered to. The number is the one in
// the session cookie, never one sent from the browser.

import { getSession } from '@/lib/auth/session';
import { saveAddress } from '@/lib/services/addresses';
import { listAddresses, rememberAddresses } from '@/lib/sql/customer-addresses';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

const required = ['name', 'houseNo', 'street', 'city', 'state', 'pincode'];

export async function GET() {
  const session = await getSession();
  if (!session?.mobile) return Response.json({ ok: true, addresses: [] });

  const addresses = await listAddresses({ mobile: session.mobile, userId: session.id }).catch(() => []);
  return Response.json({ ok: true, addresses });
}

export async function POST(request) {
  const session = await getSession();
  if (!session?.mobile) return fail('Please sign in first.', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const missing = required.filter((k) => !String(body[k] || '').trim());
  if (missing.length) return fail('Please fill in every required field.');
  if (!/^[1-9]\d{5}$/.test(String(body.pincode).trim())) return fail('Enter a valid 6-digit pin code.');

  // The service system is told first: it is what the technicians work from.
  // A failure there is not fatal — the address is still kept here, so the
  // booking about to be made can use it.
  const result = await saveAddress({ ...body, mobile: session.mobile });
  const saved = result.ok && result.addresses?.length
    ? result.addresses
    : [{
      id: `new-${Date.now()}`,
      label: body.name,
      line: [body.houseNo, body.street, body.landmark, body.city, body.state]
        .filter(Boolean).join(', ') + (body.pincode ? ` – ${body.pincode}` : ''),
      houseNo: body.houseNo,
      street: body.street,
      landmark: body.landmark || '',
      city: body.city,
      state: body.state,
      pincode: body.pincode,
    }];

  await rememberAddresses(session.mobile, saved).catch(() => {});
  const addresses = await listAddresses({ mobile: session.mobile, userId: session.id }).catch(() => saved);

  if (!result.ok) console.warn('[address] kept locally only:', result.error);
  return Response.json({ ok: true, addresses, chosen: saved[0] });
}

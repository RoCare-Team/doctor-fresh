// Books a service visit: kept here, sent to the RO Care service system, and —
// when the customer chose to pay now — handed to the payment gateway first.
//
// A visit paid online reaches the service system only once the money has
// arrived (see the payment callback), so nobody is dispatched against a
// payment that failed.

import { createBooking } from '@/lib/services/wizard';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';
import { getSession } from '@/lib/auth/session';
import { saveBooking, markSentToService, setBookingStatus } from '@/lib/sql/service-bookings';
import { createPaymentTransaction, initiateEasebuzz } from '@/lib/sql/easebuzz';
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

  const services = Array.isArray(body.services) ? body.services.slice(0, 20) : [];
  const amount = services.reduce((n, s) => n + (Number(s.price) || 0) * (Number(s.qty) || 1), 0);
  const online = body.payment === 'online';

  const session = await getSession();

  const saved = await saveBooking({
    userId: session?.id || null,
    name,
    mobile,
    email: email || '',
    houseNo: body.houseNo,
    area: body.area,
    nearBy: body.nearBy,
    city: body.city,
    state: body.state,
    pincode,
    date: body.date,
    slot: body.slot,
    services,
    amount,
    payment: online ? 'online' : 'after',
  });
  if (saved.error) return fail(saved.error, 502);

  const visit = {
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
  };

  /* ------------------------------------------------- pay after the visit */
  if (!online) {
    const result = await createBooking(visit);

    // Already in the service team's queue under this number: the visit stands,
    // and the booking is kept here so the team can see what was asked for.
    if (result.duplicate) {
      await markSentToService(saved.id, 'already-open').catch(() => {});
      return Response.json({ ok: true, ref: saved.ref, duplicate: true });
    }

    if (!result.ok) {
      // The service team never received it, so the row here should not sit in
      // the admin looking like a visit someone is going to make.
      await setBookingStatus(saved.id, 'cancelled').catch(() => {});
      return fail(result.reason, 502);
    }

    await markSentToService(saved.id, result.reference || '').catch(() => {});
    return Response.json({ ok: true, ref: saved.ref, reference: result.reference });
  }

  /* -------------------------------------------------------- pay now */
  if (amount <= 0) return fail('There is nothing to pay for. Please add a service.');

  /**
   * A payment page of your own.
   *
   * SERVICE_PAYMENT_URL sends the customer to a page that already takes
   * payments — the old site's, or anyone's — with the booking on the query
   * string, and no gateway credentials here at all. It wins over the direct
   * Easebuzz integration, which is used when no such page is set.
   */
  const handOver = process.env.SERVICE_PAYMENT_URL;
  if (handOver) {
    const base = new URL(request.url).origin;
    const url = new URL(handOver);
    url.searchParams.set('ref', saved.ref);
    url.searchParams.set('booking_id', String(saved.id));
    url.searchParams.set('amount', amount.toFixed(2));
    url.searchParams.set('name', name);
    url.searchParams.set('phone', mobile);
    if (email) url.searchParams.set('email', email);
    url.searchParams.set('productinfo', services.map((x) => x.name).join(', ').slice(0, 100) || 'RO Care India');
    // Where that page should send the customer back to, whichever way it goes.
    url.searchParams.set('surl', `${base}/api/payment/easebuzz/service-success`);
    url.searchParams.set('furl', `${base}/api/payment/easebuzz/service-failed`);
    url.searchParams.set('udf1', String(saved.id));

    return Response.json({ ok: true, ref: saved.ref, redirect: url.toString() });
  }

  let transactionId;
  try {
    transactionId = await createPaymentTransaction({
      saleId: 0, userId: session?.id || null, gateway: 'easebuzz', amount,
    });
  } catch (err) {
    console.error('[booking] could not record the payment attempt:', err.message);
    return fail('Could not start the payment. Please try again.', 502);
  }

  const base = new URL(request.url).origin;
  const started = await initiateEasebuzz({
    transactionId,
    // The booking, not a sale: the service callbacks read it back from here.
    saleId: saved.id,
    amount,
    name,
    email: email || '',
    phone: mobile,
    successUrl: `${base}/api/payment/easebuzz/service-success`,
    failureUrl: `${base}/api/payment/easebuzz/service-failed`,
  });

  if (started.error) {
    // The booking was written before the gateway was asked; a booking nobody
    // can pay for should not sit in the admin looking live.
    await setBookingStatus(saved.id, 'cancelled').catch(() => {});
    return fail(started.error, 502);
  }

  return Response.json({ ok: true, ref: saved.ref, redirect: started.redirect });
}

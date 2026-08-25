// Placing an order.
//
// Cash on delivery is completed here. An online payment creates the order,
// records the attempt in `payment_transactions` and hands back the Easebuzz
// page to send the visitor to — the same sequence Home.php → cart_finish()
// follows.

import { isDbEnabled } from '@/lib/db';
import { priceBasket, createOrder, getPaymentOptions } from '@/lib/sql/orders';
import { createPaymentTransaction, initiateEasebuzz } from '@/lib/sql/easebuzz';
import { getSession } from '@/lib/auth/session';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

const REQUIRED = [
  ['name', 'your full name'],
  ['mobile', 'a mobile number'],
  ['house_no', 'your house or building number'],
  ['area', 'your road name or area'],
  ['city', 'your city'],
  ['state', 'your state'],
  ['c_pincode', 'your pin code'],
];

/** Where Easebuzz sends the visitor back to. */
function callbackBase(request) {
  const origin = request.headers.get('origin');
  // In development the callback has to come back to the machine running it.
  return origin && origin.startsWith('http://localhost') ? origin : SITE_URL;
}

export async function POST(request) {
  if (!isDbEnabled()) return fail('Orders are unavailable right now. Please call +91-9311587716.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const form = body.address || {};

  for (const [field, label] of REQUIRED) {
    if (!String(form[field] ?? '').trim()) return fail(`Please enter ${label}.`);
  }

  const mobile = normaliseMobile(form.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const name = normaliseName(form.name);
  if (!name) return fail('Enter your full name.');

  const email = normaliseEmail(form.email);
  if (email === null) return fail('Enter a valid email address.');

  if (!/^\d{6}$/.test(String(form.c_pincode).trim())) return fail('Enter a valid 6-digit pin code.');

  // Only methods the shop has switched on may be used, whatever was posted.
  const options = await getPaymentOptions();
  const chosen = options.find((o) => o.id === body.payment) || options.find((o) => o.ready);
  if (!chosen) return fail('No payment method is available right now. Please call +91-9311587716.', 503);

  const online = chosen.id !== 'cash_on_delivery';
  if (online && chosen.id !== 'easebuzz') {
    return fail('That payment method is not available online yet. Please choose another.', 400);
  }

  // The basket is repriced from the database — the browser only says which
  // products and how many.
  const priced = await priceBasket(body.items, body.coupon);
  if (priced.error) return fail(priced.error);

  const session = await getSession();

  const address = {
    ...form, name, mobile, email: email || '', payment: chosen.id,
  };

  let order;
  try {
    order = await createOrder({
      items: priced.items,
      totals: priced.totals,
      address,
      coupon: priced.coupon,
      paymentType: chosen.id,
      userId: session?.id || null,
      // Stock moves now for cash, and only on confirmation for a payment that
      // may still be abandoned.
      reserveStock: !online,
    });
  } catch (err) {
    console.error('[checkout] could not create the order:', err.message);
    return fail('Could not place your order. Please try again or call +91-9311587716.', 502);
  }

  const href = order.guestId ? `/order/${order.guestId}` : `/order/${order.saleId}`;

  if (!online) {
    return Response.json({ ok: true, saleId: order.saleId, saleCode: order.saleCode, href });
  }

  /* --------------------------------------------------------- online payment */
  let transactionId;
  try {
    transactionId = await createPaymentTransaction({
      saleId: order.saleId,
      userId: session?.id || null,
      gateway: 'easebuzz',
      amount: priced.totals.grandTotal,
    });
  } catch (err) {
    console.error('[checkout] could not record the payment attempt:', err.message);
    return fail('Could not start the payment. Please try again.', 502);
  }

  const base = callbackBase(request);
  const started = await initiateEasebuzz({
    transactionId,
    saleId: order.saleId,
    amount: priced.totals.grandTotal,
    name,
    email,
    phone: mobile,
    successUrl: `${base}/api/payment/easebuzz/success`,
    failureUrl: `${base}/api/payment/easebuzz/failed`,
  });

  if (started.error) return fail(started.error, 502);

  return Response.json({
    ok: true,
    saleId: order.saleId,
    saleCode: order.saleCode,
    href,
    // The browser leaves for the hosted payment page.
    redirect: started.redirect,
  });
}

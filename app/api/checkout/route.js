// Placing an order.
//
// Cash on delivery is completed here. An online payment creates the order,
// records the attempt in `payment_transactions` and hands back the Easebuzz
// page to send the visitor to — the same sequence Home.php → cart_finish()
// follows.

import { after } from 'next/server';
import { isDbEnabled } from '@/lib/db';
import { sendOrderPlacedWhatsApp, notifyTeam } from '@/lib/whatsapp';
import { priceBasket, createOrder, getPaymentOptions } from '@/lib/sql/orders';
import { createPaymentTransaction, initiateEasebuzz } from '@/lib/sql/easebuzz';
import { getSession } from '@/lib/auth/session';
import { forwardProductLead } from '@/lib/services/product-lead';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

/**
 * Everything about an order, on one line, for the office WhatsApp.
 *
 * Whoever reads it should not have to open the admin to know what was bought,
 * for how much and where it goes — so the items, the money and the address are
 * all in it.
 */
function orderDetail({
  items = [], totals = {}, address = {}, payment = '',
}) {
  const count = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);
  const first = items[0]?.name || 'order';
  const rest = items.length > 1 ? ` +${items.length - 1} more` : '';
  const where = [address.city, address.c_pincode].filter(Boolean).join(' ');

  return `${payment}, Rs ${totals.grandTotal ?? 0} — ${count} item(s): ${first}${rest}${where ? ` — ${where}` : ''}`;
}

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

  // An order belongs to an account: it is what puts it in "My orders" and what
  // support searches on later. The UI asks before checkout, so reaching here
  // signed out means the cookie expired mid-flow.
  const session = await getSession();
  if (!session) {
    return Response.json(
      { ok: false, error: 'Please sign in to place your order.', signIn: true },
      { status: 401 },
    );
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

  // A copy for the service system's panel, for cash and online alike — sent
  // once the response is on its way, so their server never holds up checkout.
  after(() => forwardProductLead({
    address,
    items: priced.items,
    coupon: priced.coupon?.code || '',
    payment: chosen.id,
  }));

  if (!online) {
    // A cash order is final the moment it is written, so the customer hears
    // about it now. after() sends it once the response is on its way, so a
    // slow WhatsApp API never holds up — or fails — the checkout.
    after(() => sendOrderPlacedWhatsApp({ name, mobile }));
    // And the office, so an order is not waiting on somebody opening the admin.
    after(() => notifyTeam({
      what: `New order #${order.saleCode || order.saleId}`,
      name,
      mobile,
      email: address.email || '',
      detail: orderDetail({
        items: priced.items, totals: priced.totals, address, payment: 'Cash on delivery',
      }),
    }));
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

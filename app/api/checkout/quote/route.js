// Live totals for the checkout page.
//
// The browser sends the product ids and quantities and, optionally, a coupon
// code. Everything shown to the visitor — price, GST, shipping, discount —
// is worked out here from the database, so the summary they read is the same
// arithmetic the order is written with.

import { isDbEnabled } from '@/lib/db';
import { priceBasket, getPaymentOptions } from '@/lib/sql/orders';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!isDbEnabled()) {
    return Response.json({ ok: false, error: 'Checkout is unavailable right now.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const priced = await priceBasket(body.items, body.coupon);
  const paymentOptions = await getPaymentOptions();

  if (priced.error) {
    // The basket still needs its payment list so the page can render.
    return Response.json({ ok: false, error: priced.error, paymentOptions }, { status: 400 });
  }

  return Response.json({
    ok: true,
    items: priced.items,
    coupon: priced.coupon,
    totals: priced.totals,
    paymentOptions,
  });
}

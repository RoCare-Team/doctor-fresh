// The customer's basket inside the service system.
//
// A booking filed with `add_lead_with_full_dtls.php` is filed against a cart
// that lives there, not against the basket this site keeps in the browser. So
// before such a booking is made, the basket is copied across:
//
//   view_cart_details.php  { cid }                                → AllCartDetails
//   add_to_cart.php        { cid, service_id, type, quantity }    → AllCartDetails
//                          type "add" sets a quantity, "delete" removes a line
//
// The service ids are the service's own — this site's service list is read
// from the same catalogue — so a line copied across is the same line.
//
// The copy is made to match, not to append: anything already in their cart
// that is not in this basket is removed first, or the customer would pay for
// something they took out.

const BASE = process.env.SERVICE_CUSTOMER_URL
  || 'https://waterpurifierservicecenter.in/customer/ro_customer';

const CART_URL = `${BASE}/add_to_cart.php`;
const VIEW_URL = `${BASE}/view_cart_details.php`;

// Only the water purifier basket is ours; the service sells other appliances.
const OURS = process.env.SERVICE_CART_GROUP || 'Water Purifier';

const DEBUG = process.env.OTP_DEBUG === '1' || process.env.NODE_ENV !== 'production';

async function call(url, payload) {
  let text;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    text = await res.text();
  } catch (err) {
    console.error('[service-cart] could not reach the service:', err.message);
    return null;
  }

  try {
    // Their PHP prefixes a blank line often enough to matter.
    return JSON.parse(String(text).trim());
  } catch {
    console.error('[service-cart] unreadable answer:', String(text).slice(0, 200));
    return null;
  }
}

/** The water purifier basket out of whatever the service answered with. */
function basketOf(data) {
  const all = Array.isArray(data?.AllCartDetails) ? data.AllCartDetails : [];
  const found = all.find((c) => c?.leadtype_name === OURS) || all[0] || null;
  if (!found) return null;

  return {
    cartId: String(found.category_cart_id || ''),
    lines: (Array.isArray(found.cart_dtls) ? found.cart_dtls : []).map((l) => ({
      id: String(l.service_id || l.id || ''),
      qty: Number(l.quantity) || 0,
    })).filter((l) => l.id),
  };
}

/** What the service currently has for this customer. */
export async function readCart(cid) {
  if (!cid) return null;
  return basketOf(await call(VIEW_URL, { cid: String(cid) }));
}

/**
 * Makes the service's cart match this basket and returns its id.
 *
 * Returns `''` when the service cannot be reached or gives no cart id — the
 * caller then books the older way instead of stopping.
 */
export async function syncCart(cid, lines = []) {
  if (!cid || !lines.length) return '';

  const wanted = new Map(
    lines
      .map((l) => [String(l.id), Math.max(1, Math.min(9, Number(l.qty) || 1))])
      .filter(([id]) => id),
  );
  if (!wanted.size) return '';

  const before = await readCart(cid);
  if (DEBUG) console.info('[service-cart] theirs before:', JSON.stringify(before));

  let latest = before;

  // Out with what is not ours.
  for (const line of before?.lines || []) {
    if (wanted.has(line.id)) continue;
    // eslint-disable-next-line no-await-in-loop
    const answer = await call(CART_URL, {
      cid: String(cid), service_id: line.id, type: 'delete', quantity: 0,
    });
    if (answer) latest = basketOf(answer) || latest;
  }

  // In with ours, at the quantity this basket says.
  for (const [id, qty] of wanted) {
    const already = before?.lines.find((l) => l.id === id);
    if (already && already.qty === qty) continue;
    // eslint-disable-next-line no-await-in-loop
    const answer = await call(CART_URL, {
      cid: String(cid), service_id: id, type: 'add', quantity: qty,
    });
    if (answer) latest = basketOf(answer) || latest;
  }

  if (!latest?.cartId) {
    // Nothing came back with an id — one more look, in case the adds answered
    // without the basket.
    latest = await readCart(cid);
  }

  if (DEBUG) console.info('[service-cart] cart id:', latest?.cartId || '(none)');
  return latest?.cartId || '';
}

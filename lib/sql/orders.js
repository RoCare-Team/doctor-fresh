// Placing an order.
//
// Writes the same rows the PHP checkout writes (Home.php → cart_finish(), the
// cash-on-delivery path): one `sale` row, one `stock` movement per line, and a
// decrement of `product.current_stock`. No schema change, no new table.
//
// Prices, tax and shipping are recalculated here from the database. The basket
// arrives from the browser and is only trusted for *which* product and *how
// many* — never for what it costs.

import crypto from 'node:crypto';
import { query, queryOne, mutate } from '@/lib/db';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------- settings */

async function businessSettings() {
  const rows = await query(
    "SELECT `type`, `value` FROM `business_settings` WHERE `type` IN ('shipping_cost', 'shipping_cost_type')",
  );
  const map = Object.fromEntries((rows || []).map((r) => [r.type, r.value]));
  return {
    shippingCost: num(map.shipping_cost),
    shippingType: map.shipping_cost_type || 'fixed',
  };
}

/* ---------------------------------------------------------- payment options */

/**
 * Which payment methods the shop has switched on, read from
 * `business_settings` exactly as cart_checkout() does — a gateway that is not
 * 'ok' there is not offered here either.
 *
 * `ready` marks the ones this site can complete today. The hosted gateways
 * need their redirect flow wired before they can take money, so they are shown
 * as unavailable rather than silently failing at the last step.
 */
const GATEWAYS = [
  { key: 'cash_set', id: 'cash_on_delivery', label: 'Cash on delivery', ready: true },
  { key: 'easebuzz_set', id: 'easebuzz', label: 'Pay online — card, UPI, netbanking', ready: true },
  { key: 'ssl_set', id: 'sslcommerz', label: 'Pay online (SSLCommerz)', ready: false },
  { key: 'paytm_set', id: 'paytm', label: 'Paytm', ready: false },
  { key: 'ccavenue_set', id: 'ccavenue', label: 'CCAvenue', ready: false },
  { key: 'pum_set', id: 'pum', label: 'PayUmoney', ready: false },
  { key: 'stripe_set', id: 'stripe', label: 'Card (Stripe)', ready: false },
  { key: 'paypal_set', id: 'paypal', label: 'PayPal', ready: false },
];

export async function getPaymentOptions() {
  const rows = await query(
    `SELECT \`type\`, \`value\` FROM \`business_settings\` WHERE \`type\` IN (${GATEWAYS.map(() => '?').join(',')})`,
    GATEWAYS.map((g) => g.key),
  );
  const enabled = new Set(
    (rows || []).filter((r) => String(r.value).trim().toLowerCase() === 'ok').map((r) => r.type),
  );

  return GATEWAYS.filter((g) => enabled.has(g.key)).map(({ key, ...rest }) => rest);
}

/* ------------------------------------------------------------------ coupons */

/**
 * A coupon from the `coupon` table. `spec` holds the discount as JSON:
 * { set_type, set, discount_type: 'percent'|'amount', discount_value, shipping_free }
 */
export async function findCoupon(code) {
  const trimmed = String(code ?? '').trim();
  if (!trimmed) return null;

  const row = await queryOne('SELECT `coupon_id`, `code`, `till`, `spec` FROM `coupon` WHERE `code` = ? LIMIT 1', [trimmed]);
  if (!row) return { error: 'That coupon code is not valid.' };

  // `till` is the last day the coupon works.
  if (row.till && new Date(`${row.till}T23:59:59`) < new Date()) {
    return { error: 'That coupon has expired.' };
  }

  let spec;
  try {
    spec = JSON.parse(row.spec || '{}');
  } catch {
    return { error: 'That coupon cannot be applied.' };
  }

  return {
    id: row.coupon_id,
    code: row.code,
    type: String(spec.discount_type || '').toLowerCase(),
    value: num(spec.discount_value),
    freeShipping: Boolean(spec.shipping_free),
  };
}

/* ------------------------------------------------------------------ pricing */

/**
 * Rebuilds the basket from the database.
 *
 * Returns the priced lines plus the totals, or an error when a line cannot be
 * fulfilled — an unknown product, or not enough stock.
 */
export async function priceBasket(lines = [], couponCode = null) {
  const wanted = lines
    .map((l) => ({ id: Number(l.id), qty: Math.max(1, Math.min(Number(l.qty) || 1, 999)) }))
    .filter((l) => Number.isFinite(l.id) && l.id > 0);

  if (!wanted.length) return { error: 'Your cart is empty.' };

  const placeholders = wanted.map(() => '?').join(',');
  const rows = await query(
    `SELECT \`product_id\`, \`title\`, \`slug\`, \`sale_price\`, \`discount\`, \`discount_type\`,
            \`tax\`, \`tax_type\`, \`shipping_cost\`, \`current_stock\`, \`num_of_imgs\`, \`category\`, \`sub_category\`
       FROM \`${PRODUCTS}\` WHERE \`product_id\` IN (${placeholders})`,
    wanted.map((l) => l.id),
  );
  if (rows === null) return { error: 'Could not reach the catalogue. Please try again.' };

  const byId = new Map(rows.map((r) => [Number(r.product_id), r]));
  const settings = await businessSettings();

  const items = [];
  let subtotal = 0;
  let tax = 0;
  let perProductShipping = 0;

  for (const line of wanted) {
    const row = byId.get(line.id);
    if (!row) return { error: 'One of the products in your cart is no longer available.' };

    const stock = num(row.current_stock);
    if (stock > 0 && line.qty > stock) {
      return { error: `Only ${stock} left of ${row.title}. Please reduce the quantity.` };
    }

    // Same rule as the storefront: sale_price minus the discount, in percent
    // or rupees depending on discount_type.
    const salePrice = num(row.sale_price);
    const discount = num(row.discount);
    const isPercent = String(row.discount_type || '').toLowerCase() === 'percent';
    const price = discount > 0 && salePrice > 0
      ? round2(isPercent ? salePrice - (salePrice * discount) / 100 : salePrice - discount)
      : salePrice;

    if (!price) return { error: `${row.title} is priced on request — please call us to order it.` };

    const lineTax = String(row.tax_type || '').toLowerCase() === 'percent'
      ? round2((price * num(row.tax)) / 100)
      : num(row.tax);
    const lineShipping = num(row.shipping_cost);

    subtotal += price * line.qty;
    tax += lineTax * line.qty;
    perProductShipping += lineShipping * line.qty;

    items.push({
      id: String(line.id),
      qty: line.qty,
      name: row.title,
      slug: row.slug,
      price,
      tax: lineTax,
      shipping: lineShipping,
      subtotal: round2(price * line.qty),
      categoryId: num(row.category),
      subCategoryId: String(row.sub_category || '').split(',')[0] || '',
      image: `/uploads/product_image/product_${line.id}_1.jpg`,
    });
  }

  let shipping = settings.shippingType === 'fixed' ? settings.shippingCost : perProductShipping;

  // Coupon, applied to the item total the way the PHP cart does.
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const found = await findCoupon(couponCode);
    if (found?.error) return { error: found.error };
    if (found) {
      discount = found.type === 'percent'
        ? round2((subtotal * found.value) / 100)
        : Math.min(found.value, subtotal);
      if (found.freeShipping) shipping = 0;
      coupon = { code: found.code, discount: round2(discount) };
    }
  }

  const grandTotal = round2(Math.max(0, subtotal + tax + shipping - discount));

  return {
    items,
    coupon,
    totals: {
      subtotal: round2(subtotal),
      tax: round2(tax),
      shipping: round2(shipping),
      discount: round2(discount),
      grandTotal,
    },
  };
}

/* -------------------------------------------------------------- order write */

/** `product_details` is stored keyed by a per-line id, as the PHP cart does. */
function productDetails(items) {
  const out = {};
  for (const item of items) {
    const rowid = crypto.createHash('md5').update(`${item.id}-${item.qty}-${Date.now()}`).digest('hex');
    out[rowid] = {
      rowid,
      id: item.id,
      qty: item.qty,
      name: item.name,
      price: item.price,
      tax: item.tax,
      shipping: item.shipping,
      subtotal: item.subtotal,
      image: item.image,
      option: JSON.stringify({ color: { title: 'Color', value: null } }),
      coupon: '',
      discount: '',
    };
  }
  return out;
}

/**
 * Creates the order. `userId` is null for a guest, who gets a `guest_id` to
 * look the order up with — the same arrangement the PHP checkout uses.
 */
export async function createOrder({
  items, totals, address, coupon = null,
  paymentType = 'cash_on_delivery', userId = null,
  // Cash orders take the stock straight away. An online payment only does so
  // once the gateway confirms it — an abandoned payment must not hold stock.
  reserveStock = true,
}) {
  const now = Math.floor(Date.now() / 1000);

  const deliveryStatus = JSON.stringify([{ admin: '', status: 'pending', comment: '', delivery_time: '' }]);
  const paymentStatus = JSON.stringify([{ admin: '', status: 'due' }]);

  const result = await mutate(
    `INSERT INTO \`sale\`
       (\`buyer\`, \`product_details\`, \`shipping_address\`, \`vat\`, \`shipping\`,
        \`payment_type\`, \`payment_status\`, \`payment_details\`, \`grand_total\`,
        \`sale_datetime\`, \`delivary_datetime\`, \`delivery_status\`, \`viewed\`, \`created_at\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, '', ?, 'no', NOW())`,
    [
      userId ? String(userId) : 'guest',
      JSON.stringify(productDetails(items)),
      JSON.stringify(coupon ? { ...address, coupon: coupon.code, coupon_discount: coupon.discount } : address),
      String(totals.tax),
      String(totals.shipping),
      paymentType,
      paymentStatus,
      String(totals.grandTotal),
      String(now),
      deliveryStatus,
    ],
  );

  const saleId = result.insertId;
  const stamp = new Date(now * 1000);
  const saleCode = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}R${saleId}`;
  const guestId = userId ? null : `${saleId}-${crypto.randomBytes(5).toString('hex')}`;

  await mutate(
    'UPDATE `sale` SET `sale_code` = ?, `guest_id` = ? WHERE `sale_id` = ?',
    [saleCode, guestId, saleId],
  );

  if (reserveStock) await recordStockMovement(saleId, items);

  return { saleId, saleCode, guestId };
}

/**
 * Takes the sold quantity out of stock and records the movement, exactly as
 * the PHP checkout does. A failure here must not lose the order, so it is
 * logged rather than thrown — the sale row is already committed.
 */
async function recordStockMovement(saleId, items) {
  for (const item of items) {
    try {
      await mutate(
        `UPDATE \`${PRODUCTS}\` SET \`current_stock\` = GREATEST(\`current_stock\` - ?, 0) WHERE \`product_id\` = ?`,
        [item.qty, item.id],
      );
      await mutate(
        `INSERT INTO \`stock\`
           (\`type\`, \`category\`, \`sub_category\`, \`product\`, \`quantity\`, \`rate\`,
            \`total\`, \`reason_note\`, \`sale_id\`, \`datetime\`, \`added_by\`)
         VALUES ('destroy', ?, ?, ?, ?, ?, '0', 'sale', ?, ?, 'website')`,
        [
          String(item.categoryId), String(item.subCategoryId), String(item.id),
          String(item.qty), String(item.price), String(saleId),
          String(Math.floor(Date.now() / 1000)),
        ],
      );
    } catch (err) {
      console.error(`[order] stock update failed for product ${item.id}:`, err.message);
    }
  }
}

/**
 * Takes the stock for an order that was created without reserving any —
 * an online payment, once the gateway confirms it. Doing it twice for the same
 * order is prevented by the marker row in `stock`.
 */
export async function reserveStockForOrder(saleId) {
  const already = await queryOne("SELECT `stock_id` FROM `stock` WHERE `sale_id` = ? LIMIT 1", [String(saleId)]);
  if (already) return;

  const sale = await queryOne("SELECT `product_details` FROM `sale` WHERE `sale_id` = ? LIMIT 1", [saleId]);
  if (!sale) return;

  let lines = [];
  try {
    lines = Object.values(JSON.parse(sale.product_details || '{}'));
  } catch {
    return;
  }

  await recordStockMovement(saleId, lines.map((l) => ({
    id: l.id, qty: num(l.qty, 1), price: num(l.price), categoryId: '', subCategoryId: '',
  })));
}

/* --------------------------------------------------------------- retrieval */

/** One order, by id for a signed-in buyer or by guest id for a guest. */
export async function getOrder({ saleId, guestId, userId }) {
  const row = guestId
    ? await queryOne('SELECT * FROM `sale` WHERE `guest_id` = ? LIMIT 1', [guestId])
    : await queryOne('SELECT * FROM `sale` WHERE `sale_id` = ? LIMIT 1', [saleId]);

  if (!row) return null;
  // A signed-in buyer may only see their own orders.
  if (!guestId && String(row.buyer) !== String(userId)) return null;

  let items = [];
  try {
    items = Object.values(JSON.parse(row.product_details || '{}'));
  } catch { /* a malformed row still shows its totals */ }

  let address = {};
  try {
    address = JSON.parse(row.shipping_address || '{}');
  } catch { /* same */ }

  let paid = false;
  try {
    paid = JSON.parse(row.payment_status || '[]').some((s) => s.status === 'paid');
  } catch { /* an unreadable status simply reads as unpaid */ }

  return {
    id: row.sale_id,
    code: row.sale_code,
    paid,
    guestId: row.guest_id,
    paymentType: row.payment_type,
    placedAt: row.created_at,
    items,
    address,
    totals: {
      tax: num(row.vat),
      shipping: num(row.shipping),
      grandTotal: num(row.grand_total),
      subtotal: round2(num(row.grand_total) - num(row.vat) - num(row.shipping)),
    },
  };
}

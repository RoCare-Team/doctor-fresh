// What the admin area reads and writes.

import crypto from 'node:crypto';
import { query, queryOne, mutate } from '@/lib/db';
import { readAddress, addressLine } from './address';
import { productImages } from './media';
import { warmMedia } from '@/lib/blob';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const tenDigits = (v) => String(v ?? '').replace(/\D/g, '').slice(-10);

/* ------------------------------------------------------------------- admins */

export async function findAdminByMobile(mobile) {
  const wanted = tenDigits(mobile);
  if (wanted.length !== 10) return null;

  const rows = await query('SELECT `admin_id`, `name`, `email`, `phone`, `role` FROM `admin`');
  const row = (rows || []).find((r) => tenDigits(r.phone) === wanted);
  if (!row) return null;

  return {
    id: row.admin_id,
    name: row.name || 'Admin',
    email: row.email || '',
    mobile: wanted,
    role: String(row.role || ''),
  };
}

                                                                                
export async function verifyAdminPassword(email, password) {
  const wanted = String(email ?? '').trim().toLowerCase();
  if (!wanted || !password) return null;

  const rows = await query(
    'SELECT `admin_id`, `name`, `email`, `phone`, `role`, `password` FROM `admin`',
  );
  const row = (rows || []).find((r) => String(r.email ?? '').trim().toLowerCase() === wanted);
  if (!row) return null;

  const given = crypto.createHash('sha1').update(String(password)).digest('hex');
  const stored = String(row.password ?? '');
  if (given.length !== stored.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(stored))) return null;

  return {
    id: row.admin_id,
    name: row.name || 'Admin',
    email: row.email || '',
    mobile: tenDigits(row.phone),
    role: String(row.role || ''),
  };
}

/* ------------------------------------------------------------------- orders */

/** The statuses the existing data uses, in the order an order moves through. */
export const DELIVERY_STATUSES = ['pending', 'shipped', 'delivered', 'order cancelled'];

function firstStatus(json, fallback) {
  try {
    return JSON.parse(json || '[]')[0]?.status || fallback;
  } catch {
    return fallback;
  }
}

function orderRow(row) {
  let items = [];
  try {
    items = Object.values(JSON.parse(row.product_details || '{}'));
  } catch { /* a malformed row still shows its totals */ }

  let stored = {};
  try {
    stored = JSON.parse(row.shipping_address || '{}');
  } catch { /* same */ }
  const address = readAddress(stored);

  return {
    id: row.sale_id,
    code: row.sale_code,
    buyer: row.buyer,
    guestId: row.guest_id,
    // `sale_datetime` is the true unix time; `created_at` is DB-local.
    placedAt: Number(row.sale_datetime) > 0 ? Number(row.sale_datetime) * 1000 : row.created_at,
    paymentType: row.payment_type,
    paid: firstStatus(row.payment_status, 'due') === 'paid',
    delivery: firstStatus(row.delivery_status, 'pending'),
    total: num(row.grand_total),
    tax: num(row.vat),
    taxPercent: num(row.vat_percent),
    shipping: num(row.shipping),
    // Set when the payment came back confirmed; blank on an unpaid order.
    paidAt: Number(row.payment_timestamp) > 0 ? Number(row.payment_timestamp) * 1000 : null,
    customer: {
      name: address.name,
      mobile: address.mobile,
      email: address.email,
      address: addressLine(address),
      pincode: address.c_pincode,
      landmark: address.near_by,
      type: address.address_type,
      note: address.message,
    },
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      qty: num(i.qty, 1),
      price: num(i.price),
      subtotal: num(i.subtotal),
      // The file name stored on the order is the one the PHP cart guessed and
      // is often not the file that shipped, so the product's real image wins.
      image: productImages(i.id, 1)[0] || i.image || '',
    })),
    itemCount: items.reduce((n, i) => n + num(i.qty, 1), 0),
  };
}

const ORDER_COLUMNS = `\`sale_id\`, \`sale_code\`, \`buyer\`, \`guest_id\`, \`product_details\`,
  \`shipping_address\`, \`payment_type\`, \`payment_status\`, \`delivery_status\`,
  \`vat\`, \`vat_percent\`, \`shipping\`, \`grand_total\`, \`created_at\`, \`sale_datetime\`,
  \`payment_timestamp\``;

/** Orders, newest first, optionally filtered by status or a search term. */
export async function listOrders({
  status, search, from = 0, limit = 50, offset = 0,
} = {}) {
  await warmMedia(); // uploaded photos in Vercel Blob, read by productImages()/blogImage()
  const where = [];
  const params = [];

  // Orders placed since a moment, counted on the true unix time.
  if (from) {
    where.push('CAST(`sale_datetime` AS UNSIGNED) >= ?');
    params.push(Number(from));
  }

  if (search) {
    // The customer's details live inside the stored JSON, so the search runs
    // across the code and that blob rather than over separate columns.
    where.push('(`sale_code` LIKE ? OR `shipping_address` LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = await query(
    `SELECT ${ORDER_COLUMNS} FROM \`sale\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY \`sale_id\` DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  if (rows === null) return null;

  const orders = rows.map(orderRow);
  // Status lives inside JSON, so it is filtered after mapping.
  return status ? orders.filter((o) => o.delivery === status) : orders;
}

export async function getOrder(saleId) {
  await warmMedia(); // uploaded photos in Vercel Blob, read by productImages()/blogImage()
  const row = await queryOne(`SELECT ${ORDER_COLUMNS} FROM \`sale\` WHERE \`sale_id\` = ? LIMIT 1`, [saleId]);
  if (!row) return null;

  const order = orderRow(row);

  // What the gateway did with this order, newest attempt first — an order can
  // be tried more than once, and a failed attempt explains an unpaid order.
  const attempts = await query(
    // The DB clock is not IST, so the time comes back as a unix stamp and is
    // read in Indian time where it is shown.
    `SELECT \`id\`, \`gateway\`, \`amount\`, \`gateway_transaction_id\`, \`status\`,
            UNIX_TIMESTAMP(\`created_at\`) AS \`at_unix\`
       FROM \`payment_transactions\` WHERE \`order_id\` = ? ORDER BY \`id\` DESC`,
    [saleId],
  );

  order.attempts = (attempts || []).map((a) => ({
    id: a.id,
    gateway: a.gateway,
    amount: num(a.amount),
    reference: a.gateway_transaction_id || '',
    status: a.status || '',
    at: num(a.at_unix) > 0 ? num(a.at_unix) * 1000 : null,
  }));

  return order;
}

/** Writes the status back in the shape the PHP admin reads. */
export async function setDeliveryStatus(saleId, status) {
  if (!DELIVERY_STATUSES.includes(status)) return { ok: false, reason: 'Unknown status.' };

  const row = await queryOne('SELECT `delivery_status` FROM `sale` WHERE `sale_id` = ? LIMIT 1', [saleId]);
  if (!row) return { ok: false, reason: 'Order not found.' };

  let statuses;
  try {
    statuses = JSON.parse(row.delivery_status || '[]');
  } catch {
    statuses = [];
  }

  const next = statuses.length
    ? statuses.map((s) => ({ ...s, status }))
    : [{ admin: '', status, comment: '', delivery_time: '' }];

  await mutate('UPDATE `sale` SET `delivery_status` = ? WHERE `sale_id` = ?', [JSON.stringify(next), saleId]);
  return { ok: true };
}

export async function setPaymentPaid(saleId, paid) {
  const row = await queryOne('SELECT `payment_status` FROM `sale` WHERE `sale_id` = ? LIMIT 1', [saleId]);
  if (!row) return { ok: false, reason: 'Order not found.' };

  let statuses;
  try {
    statuses = JSON.parse(row.payment_status || '[]');
  } catch {
    statuses = [];
  }

  const status = paid ? 'paid' : 'due';
  const next = statuses.length ? statuses.map((s) => ({ ...s, status })) : [{ admin: '', status }];

  await mutate(
    'UPDATE `sale` SET `payment_status` = ?, `payment_timestamp` = ? WHERE `sale_id` = ?',
    [JSON.stringify(next), paid ? String(Math.floor(Date.now() / 1000)) : '', saleId],
  );
  return { ok: true };
}

/* -------------------------------------------------------------- enquiries */

export async function listLeads({ limit = 100 } = {}) {
  const rows = await query(
    `SELECT \`lead_id\`, \`page_id\`, \`name\`, \`email\`, \`mobile\`, \`ro_status\`, \`query_for\`,
            \`state\`, \`city\`, \`unit\`, \`book_date\`, \`address\`, \`status\`, \`created_at\`
       FROM \`leads\` ORDER BY \`lead_id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  return (rows || []).map((r) => ({
    id: r.lead_id,
    name: r.name,
    mobile: r.mobile,
    email: r.email,
    service: [r.ro_status, r.query_for].filter(Boolean).join(' · '),
    place: [r.city, r.state].filter(Boolean).join(', '),
    unit: r.unit,
    bookDate: r.book_date,
    address: r.address,
    handled: String(r.status || '').toLowerCase() === 'done',
    at: r.created_at,
  }));
}

export async function listCallbacks({ limit = 100 } = {}) {
  const rows = await query(
    'SELECT `id`, `name`, `mobile`, `timing`, `status`, `created_at` FROM `request_call_back` ORDER BY `id` DESC LIMIT ?',
    [Number(limit)],
  );
  return (rows || []).map((r) => ({
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    timing: r.timing,
    handled: String(r.status || '').toLowerCase() === 'done',
    at: r.created_at,
  }));
}

/*
 * The contact form and the partner form both write to `contact_message` (the
 * PHP site only emailed them, so the table was otherwise unused). A partner
 * application is told apart by its subject — the tab it was sent from, e.g.
 * "Become A Dealer".
 */
const PARTNER_SUBJECT = "`subject` LIKE 'Become A%'";

/** "Key: value" lines, as the partner and contact routes write them. */
function messageFields(text) {
  const fields = [];
  const rest = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.match(/^(Business|Investment capacity|Education|State|City|Address|Mobile):\s*(.+)$/);
    if (m) fields.push([m[1], m[2].trim()]);
    else rest.push(line);
  }
  return { fields, body: rest.join('\n').trim() };
}

/** `kind`: 'contact' | 'partner' | '' (everything). */
export async function listMessages({ limit = 100, kind = '' } = {}) {
  const where = kind === 'partner' ? `WHERE ${PARTNER_SUBJECT}` : kind === 'contact' ? `WHERE NOT (${PARTNER_SUBJECT})` : '';
  const rows = await query(
    `SELECT \`contact_message_id\`, \`name\`, \`email\`, \`subject\`, \`message\`, \`timestamp\`, \`view\`
       FROM \`contact_message\` ${where} ORDER BY \`contact_message_id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  return (rows || []).map((r) => {
    const { fields, body } = messageFields(r.message);
    const mobile = fields.find(([k]) => k === 'Mobile')?.[1] || '';
    return {
      id: r.contact_message_id,
      name: r.name,
      email: r.email,
      subject: r.subject,
      message: body,
      mobile,
      fields: fields.filter(([k]) => k !== 'Mobile'),
      handled: String(r.view || '').toLowerCase() === 'yes',
      // Stored as a unix timestamp string.
      at: r.timestamp ? new Date(num(r.timestamp) * 1000).toISOString() : null,
    };
  });
}

/** Removes a message outright — for spam. */
export async function deleteMessage(id) {
  await mutate('DELETE FROM `contact_message` WHERE `contact_message_id` = ?', [id]);
  return { ok: true };
}

/**
 * Who asked for a brochure, and for which product.
 *
 * These are the 'Get Quotation' submissions the product pages already write
 * to `quotation`. The product is joined in because a name and a number with no
 * product is not something anyone can act on.
 */
export async function listQuotations({ limit = 200 } = {}) {
  const rows = await query(
    `SELECT q.\`quotation_id\`, q.\`product_id\`, q.\`name\`, q.\`email\`, q.\`phone\`,
            q.\`status\`, q.\`created_at\`, p.\`title\`, p.\`slug\`
       FROM \`quotation\` q
       LEFT JOIN \`${PRODUCTS}\` p ON p.\`product_id\` = q.\`product_id\`
      ORDER BY q.\`quotation_id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  return (rows || []).map((r) => ({
    id: r.quotation_id,
    name: r.name,
    mobile: r.phone,
    email: r.email,
    productId: r.product_id,
    productName: r.title || `Product #${r.product_id}`,
    productUrl: r.slug ? `/product/${r.slug}/${r.product_id}` : null,
    handled: String(r.status || '').toLowerCase() === 'done',
    at: r.created_at,
  }));
}

/** Marks an enquiry dealt with, using each table's own flag column. */
export async function markHandled(kind, id, handled = true) {
  const table = {
    lead: ['leads', 'status', 'lead_id', handled ? 'done' : ''],
    callback: ['request_call_back', 'status', 'id', handled ? 'done' : ''],
    message: ['contact_message', 'view', 'contact_message_id', handled ? 'yes' : 'no'],
    quotation: ['quotation', 'status', 'quotation_id', handled ? 'done' : 'no'],
  }[kind];
  if (!table) return { ok: false, reason: 'Unknown enquiry type.' };

  const [name, column, key, value] = table;
  await mutate(`UPDATE \`${name}\` SET \`${column}\` = ? WHERE \`${key}\` = ?`, [value, id]);
  return { ok: true };
}

/* -------------------------------------------------------------- dashboard */

/** Unix seconds at the start of the current day in India (UTC+5:30). */
function istMidnight() {
  const offset = 330 * 60;
  const now = Math.floor(Date.now() / 1000);
  return now - ((now + offset) % 86400);
}

/** The windows the dashboard can be read over, newest first. */
export const RANGES = [
  { id: 'all', label: 'All orders', days: 0, noun: 'all time' },
  { id: 'today', label: 'Today', days: 1, noun: 'today' },
  { id: '7d', label: 'Last 7 days', days: 7, noun: 'in 7 days' },
  { id: '30d', label: 'Last 30 days', days: 30, noun: 'in 30 days' },
];

/**
 * What the admin opens on when no window is asked for: everything. A day with
 * no orders yet would otherwise greet the shop with an empty table.
 */
export const DEFAULT_RANGE = 'all';

export function rangeFor(id) {
  return RANGES.find((r) => r.id === id)
    || RANGES.find((r) => r.id === DEFAULT_RANGE)
    || RANGES[0];
}

/** Unix seconds a range starts at — 0 for "all time". */
export function rangeStart(id) {
  const { days } = rangeFor(id);
  return days ? istMidnight() - (days - 1) * 86400 : 0;
}

export async function getDashboard(rangeId = DEFAULT_RANGE) {
  const range = rangeFor(rangeId);
  // Whole Indian days, counted back from midnight tonight — "last 7 days"
  // includes today, so it starts six midnights ago.
  const from = range.days ? istMidnight() - (range.days - 1) * 86400 : 0;

  // Every figure on the dashboard in one round trip. The database is a long
  // way from the app (about 200ms each way), so seven small queries cost the
  // better part of two seconds where one costs a fraction of that.
  //
  // "Today" is the Indian day measured on the unix `sale_datetime` — the DB
  // clock runs on MST and `created_at` was written with different offsets
  // over the years. Sales count only what has actually been paid. An order
  // still to process is one whose first delivery status is pending, which is
  // also what an unreadable status falls back to.
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM \`sale\` WHERE CAST(\`sale_datetime\` AS UNSIGNED) >= ?) AS orders_window,
       (SELECT COALESCE(SUM(\`grand_total\`), 0) FROM \`sale\`
         WHERE CAST(\`sale_datetime\` AS UNSIGNED) >= ? AND \`payment_status\` LIKE '%"paid"%') AS sales_window,
       (SELECT COUNT(*) FROM \`sale\`) AS orders_all,
       (SELECT COALESCE(SUM(\`grand_total\`), 0) FROM \`sale\` WHERE \`payment_status\` LIKE '%"paid"%') AS sales_all,
       (SELECT COUNT(*) FROM \`sale\`
         WHERE COALESCE(NULLIF(JSON_VALUE(\`delivery_status\`, '$[0].status'), ''), 'pending') = 'pending') AS pending,
       (SELECT COUNT(*) FROM \`leads\` WHERE \`status\` <> 'done' OR \`status\` IS NULL) AS leads_open,
       (SELECT COUNT(*) FROM \`request_call_back\` WHERE \`status\` <> 'done' OR \`status\` IS NULL) AS callbacks_open,
       (SELECT COUNT(*) FROM \`contact_message\` WHERE \`view\` <> 'yes' OR \`view\` IS NULL) AS messages_unread,
       (SELECT COUNT(*) FROM \`user\`) AS customers`,
    [from, from],
  );
  const r = rows?.[0] || {};

  return {
    range,
    ordersToday: num(r.orders_window),
    salesToday: num(r.sales_window),
    totalOrders: num(r.orders_all),
    totalSales: num(r.sales_all),
    pendingOrders: num(r.pending),
    openLeads: num(r.leads_open),
    openCallbacks: num(r.callbacks_open),
    unreadMessages: num(r.messages_unread),
    customers: num(r.customers),
  };
}

/**
 * Orders per Indian day for the last `days` days, today last — every day
 * present, including the ones with no orders, so a chart never skips a gap.
 */
export async function getDailyOrders(days = 14) {
  const IST = 330 * 60;
  const start = istMidnight() - (days - 1) * 86400;
  const rows = await query(
    `SELECT FLOOR((CAST(\`sale_datetime\` AS UNSIGNED) + ?) / 86400) AS \`day\`,
            COUNT(*) AS \`orders\`,
            COALESCE(SUM(CASE WHEN \`payment_status\` LIKE '%"paid"%' THEN \`grand_total\` ELSE 0 END), 0) AS \`paid\`
       FROM \`sale\` WHERE CAST(\`sale_datetime\` AS UNSIGNED) >= ?
      GROUP BY \`day\``,
    [IST, start],
  );

  const byDay = new Map((rows || []).map((d) => [num(d.day), { orders: num(d.orders), paid: num(d.paid) }]));
  return Array.from({ length: days }, (_, i) => {
    const dayStart = start + i * 86400;
    const key = Math.floor((dayStart + IST) / 86400);
    return { date: dayStart * 1000, ...(byDay.get(key) || { orders: 0, paid: 0 }) };
  });
}

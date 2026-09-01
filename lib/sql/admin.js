// What the admin area reads and writes.
//
// The same tables the PHP admin panel uses, so both show the same thing:
//
//   admin              who may sign in
//   sale               orders, and their delivery status
//   leads              service / product enquiries
//   request_call_back  callback requests
//   contact_message    contact form and partner applications

import crypto from 'node:crypto';
import { query, queryOne, mutate } from '@/lib/db';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const tenDigits = (v) => String(v ?? '').replace(/\D/g, '').slice(-10);

/* ------------------------------------------------------------------- admins */

/**
 * An admin by mobile number. Numbers are stored inconsistently (some with a
 * country code, some without), so both sides are compared as the last ten
 * digits.
 */
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

/**
 * Signing in with the password stored on the admin row.
 *
 * The PHP panel hashes admin passwords with SHA-1, so the same hash is
 * compared here and the existing passwords keep working. The comparison is
 * constant-time, and a wrong email and a wrong password give the same answer
 * so neither can be probed.
 */
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

  let address = {};
  try {
    address = JSON.parse(row.shipping_address || '{}');
  } catch { /* same */ }

  return {
    id: row.sale_id,
    code: row.sale_code,
    buyer: row.buyer,
    guestId: row.guest_id,
    placedAt: row.created_at,
    paymentType: row.payment_type,
    paid: firstStatus(row.payment_status, 'due') === 'paid',
    delivery: firstStatus(row.delivery_status, 'pending'),
    total: num(row.grand_total),
    tax: num(row.vat),
    shipping: num(row.shipping),
    customer: {
      name: address.name || '',
      mobile: address.mobile || '',
      email: address.email || '',
      address: [address.house_no, address.area, address.city, address.state, address.c_pincode]
        .filter(Boolean).join(', '),
    },
    items: items.map((i) => ({
      id: i.id, name: i.name, qty: num(i.qty, 1), price: num(i.price), subtotal: num(i.subtotal),
    })),
    itemCount: items.reduce((n, i) => n + num(i.qty, 1), 0),
  };
}

const ORDER_COLUMNS = `\`sale_id\`, \`sale_code\`, \`buyer\`, \`guest_id\`, \`product_details\`,
  \`shipping_address\`, \`payment_type\`, \`payment_status\`, \`delivery_status\`,
  \`vat\`, \`shipping\`, \`grand_total\`, \`created_at\``;

/** Orders, newest first, optionally filtered by status or a search term. */
export async function listOrders({ status, search, limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];

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
  const row = await queryOne(`SELECT ${ORDER_COLUMNS} FROM \`sale\` WHERE \`sale_id\` = ? LIMIT 1`, [saleId]);
  return row ? orderRow(row) : null;
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

export async function listMessages({ limit = 100 } = {}) {
  const rows = await query(
    'SELECT `contact_message_id`, `name`, `email`, `subject`, `message`, `timestamp`, `view` FROM `contact_message` ORDER BY `contact_message_id` DESC LIMIT ?',
    [Number(limit)],
  );
  return (rows || []).map((r) => ({
    id: r.contact_message_id,
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    handled: String(r.view || '').toLowerCase() === 'yes',
    // Stored as a unix timestamp string.
    at: r.timestamp ? new Date(num(r.timestamp) * 1000).toISOString() : null,
  }));
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

export async function getDashboard() {
  const [orders, leads, callbacks, messages] = await Promise.all([
    query("SELECT COUNT(*) n, SUM(`grand_total`) total FROM `sale` WHERE DATE(`created_at`) = CURDATE()"),
    query("SELECT COUNT(*) n FROM `leads` WHERE `status` <> 'done' OR `status` IS NULL"),
    query("SELECT COUNT(*) n FROM `request_call_back` WHERE `status` <> 'done' OR `status` IS NULL"),
    query("SELECT COUNT(*) n FROM `contact_message` WHERE `view` <> 'yes' OR `view` IS NULL"),
  ]);

  const pending = await listOrders({ status: 'pending', limit: 200 });

  return {
    ordersToday: num(orders?.[0]?.n),
    salesToday: num(orders?.[0]?.total),
    pendingOrders: pending?.length ?? 0,
    openLeads: num(leads?.[0]?.n),
    openCallbacks: num(callbacks?.[0]?.n),
    unreadMessages: num(messages?.[0]?.n),
  };
}

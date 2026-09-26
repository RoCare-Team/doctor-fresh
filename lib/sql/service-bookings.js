// Service visits booked on the site.
//
// The visit itself is booked with the RO Care service system, which is what
// the technicians work from — but that system is not ours to query, so every
// booking is also written here. That is what the admin lists, what a customer
// is shown after paying, and what tells us a payment was taken for a visit.
//
// `df_` table: created on first use, never part of the PHP site's schema.

import { query, queryOne, mutate } from '@/lib/db';

const TABLE = 'df_service_bookings';
const store = globalThis;

async function ensureTable() {
  if (store.__dfServiceBookings) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`ref\` VARCHAR(20) NOT NULL,
        \`user_id\` INT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`email\` VARCHAR(255) NULL,
        \`house_no\` VARCHAR(255) NULL,
        \`area\` VARCHAR(255) NULL,
        \`near_by\` VARCHAR(255) NULL,
        \`city\` VARCHAR(120) NULL,
        \`state\` VARCHAR(120) NULL,
        \`pincode\` VARCHAR(10) NULL,
        \`visit_date\` VARCHAR(20) NULL,
        \`visit_slot\` VARCHAR(40) NULL,
        \`services\` TEXT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`payment\` VARCHAR(20) NOT NULL DEFAULT 'after',
        \`payment_status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
        \`txn_id\` INT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'new',
        \`remote_ref\` VARCHAR(80) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`ref\` (\`ref\`),
        KEY \`created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfServiceBookings = true;
    return true;
  } catch (err) {
    console.error('[service-bookings] table unavailable:', err.code || err.message);
    return false;
  }
}

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

/** Short and sayable over the phone: DF-4F7K2. */
function reference() {
  const letters = 'ACDEFHJKLMNPRTUVWXY349';
  let out = '';
  for (let i = 0; i < 5; i += 1) out += letters[Math.floor(Math.random() * letters.length)];
  return `DF-${out}`;
}

/** Writes the booking and returns `{ id, ref }`. */
export async function saveBooking(fields) {
  if (!(await ensureTable())) return { error: 'Bookings are unavailable right now.' };

  const ref = reference();
  const services = Array.isArray(fields.services) ? fields.services : [];

  const result = await mutate(
    `INSERT INTO \`${TABLE}\`
       (\`ref\`, \`user_id\`, \`name\`, \`mobile\`, \`email\`, \`house_no\`, \`area\`, \`near_by\`,
        \`city\`, \`state\`, \`pincode\`, \`visit_date\`, \`visit_slot\`, \`services\`, \`amount\`,
        \`payment\`, \`payment_status\`, \`status\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    [
      ref,
      fields.userId || null,
      clean(fields.name),
      clean(fields.mobile, 20),
      clean(fields.email),
      clean(fields.houseNo),
      clean(fields.area),
      clean(fields.nearBy),
      clean(fields.city, 120),
      clean(fields.state, 120),
      clean(fields.pincode, 10),
      clean(fields.date, 20),
      clean(fields.slot, 40),
      JSON.stringify(services).slice(0, 4000),
      Number(fields.amount) || 0,
      fields.payment === 'online' ? 'online' : 'after',
      fields.payment === 'online' ? 'pending' : 'on-visit',
    ],
  );

  return { id: result.insertId, ref };
}

/** The booking a payment belongs to. */
export async function getBooking(id) {
  if (!(await ensureTable())) return null;
  const row = await queryOne(`SELECT * FROM \`${TABLE}\` WHERE \`id\` = ? LIMIT 1`, [Number(id) || 0]);
  return row ? mapBooking(row) : null;
}

export async function getBookingByRef(ref) {
  if (!(await ensureTable())) return null;
  const row = await queryOne(`SELECT * FROM \`${TABLE}\` WHERE \`ref\` = ? LIMIT 1`, [clean(ref, 20)]);
  return row ? mapBooking(row) : null;
}

/** After the gateway answers: paid, or failed and still to be paid on the visit. */
export async function markPayment(id, { status, txnId }) {
  if (!(await ensureTable())) return;
  await mutate(
    `UPDATE \`${TABLE}\` SET \`payment_status\` = ?, \`txn_id\` = ? WHERE \`id\` = ?`,
    [status, txnId || null, Number(id) || 0],
  );
}

/** Records that the visit reached the service system, and under what id. */
export async function markSentToService(id, remoteRef) {
  if (!(await ensureTable())) return;
  await mutate(
    `UPDATE \`${TABLE}\` SET \`remote_ref\` = ? WHERE \`id\` = ?`,
    [clean(remoteRef, 80), Number(id) || 0],
  );
}

/** Removes the record here. The service team's own copy is not touched. */
export async function deleteBooking(id) {
  if (!(await ensureTable())) return { error: 'Bookings are unavailable right now.' };

  const row = await queryOne(`SELECT \`id\` FROM \`${TABLE}\` WHERE \`id\` = ? LIMIT 1`, [Number(id) || 0]);
  if (!row) return { error: 'That booking no longer exists.' };

  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`id\` = ?`, [Number(id) || 0]);
  return { ok: true };
}

export async function setBookingStatus(id, status) {
  if (!(await ensureTable())) return { error: 'Bookings are unavailable right now.' };
  await mutate(`UPDATE \`${TABLE}\` SET \`status\` = ? WHERE \`id\` = ?`, [clean(status, 20), Number(id) || 0]);
  return { ok: true };
}

/** Newest first, for the admin. */
export async function listBookings({ limit = 300 } = {}) {
  if (!(await ensureTable())) return [];
  const rows = await query(
    `SELECT * FROM \`${TABLE}\` ORDER BY \`id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  return (rows || []).map(mapBooking);
}

function mapBooking(row) {
  let services = [];
  try {
    services = JSON.parse(row.services || '[]');
  } catch { /* a malformed row still shows everything else */ }

  return {
    id: row.id,
    ref: row.ref,
    name: row.name || '',
    mobile: row.mobile || '',
    email: row.email || '',
    address: [row.house_no, row.area, row.near_by, row.city, row.state, row.pincode].filter(Boolean).join(', '),
    houseNo: row.house_no || '',
    area: row.area || '',
    city: row.city || '',
    state: row.state || '',
    pincode: row.pincode || '',
    date: row.visit_date || '',
    slot: row.visit_slot || '',
    services: Array.isArray(services) ? services : [],
    amount: Number(row.amount) || 0,
    payment: row.payment || 'after',
    paymentStatus: row.payment_status || 'pending',
    status: row.status || 'new',
    remoteRef: row.remote_ref || '',
    at: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

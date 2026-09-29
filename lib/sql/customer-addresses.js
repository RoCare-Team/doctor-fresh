// The addresses we can offer a customer at booking time.
//
// The service system has no way to ask "what addresses does this number have?"
// — it only volunteers them in the answer to a verified OTP, once, at sign-in.
// Relying on that alone means an address disappears the moment someone books
// from a second device, so every address we ever see for a number is kept here
// as well, and the list is built from three places:
//
//   1. this table — what the service sent at sign-in, and anything added since
//   2. the service visits already booked on that number
//   3. the delivery addresses of that account's orders
//
// All three are the customer's own addresses, already given to us. Nothing is
// invented, and the same address arriving from two of them is shown once.
//
// `df_` table: created on first use, never part of the PHP site's schema.

import { query, mutate } from '@/lib/db';
import { normaliseAddress } from '@/lib/services/addresses';

const TABLE = 'df_customer_addresses';
const store = globalThis;

async function ensureTable() {
  if (store.__dfCustomerAddresses) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`label\` VARCHAR(255) NULL,
        \`line\` VARCHAR(500) NOT NULL,
        \`house_no\` VARCHAR(255) NULL,
        \`street\` VARCHAR(255) NULL,
        \`landmark\` VARCHAR(255) NULL,
        \`city\` VARCHAR(120) NULL,
        \`state\` VARCHAR(120) NULL,
        \`pincode\` VARCHAR(10) NULL,
        \`remote_id\` VARCHAR(40) NULL,
        \`fingerprint\` VARCHAR(64) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`one_per_number\` (\`mobile\`, \`fingerprint\`),
        KEY \`mobile\` (\`mobile\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    // Added after the table shipped; an existing one is brought up to date.
    await mutate(`ALTER TABLE \`${TABLE}\` ADD COLUMN \`remote_id\` VARCHAR(40) NULL`)
      .catch(() => { /* already there */ });

    store.__dfCustomerAddresses = true;
    return true;
  } catch (err) {
    console.error('[addresses] table unavailable:', err.code || err.message);
    return false;
  }
}

const tenDigits = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
};

/** The same address written two ways is still one address. */
const fingerprint = (line) => String(line || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .slice(0, 64);

/** Remembers addresses for a number. Duplicates are ignored, not refused. */
export async function rememberAddresses(mobile, list = []) {
  const to = tenDigits(mobile);
  if (!to || !list.length || !(await ensureTable())) return 0;

  let kept = 0;
  for (const a of list) {
    if (!a?.line) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await mutate(
        `INSERT IGNORE INTO \`${TABLE}\`
           (\`mobile\`, \`label\`, \`line\`, \`house_no\`, \`street\`, \`landmark\`, \`city\`, \`state\`, \`pincode\`, \`remote_id\`, \`fingerprint\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          to,
          String(a.label || '').slice(0, 255),
          String(a.line).slice(0, 500),
          String(a.houseNo || '').slice(0, 255),
          String(a.street || '').slice(0, 255),
          String(a.landmark || '').slice(0, 255),
          String(a.city || '').slice(0, 120),
          String(a.state || '').slice(0, 120),
          String(a.pincode || '').slice(0, 10),
          String(a.remoteId || '').slice(0, 40),
          fingerprint(a.line),
        ],
      );
      kept += 1;
    } catch (err) {
      console.error('[addresses] could not remember one:', err.code || err.message);
    }
  }
  return kept;
}

/** Everything we already know about where this customer is. */
export async function listAddresses({ mobile, userId }) {
  const to = tenDigits(mobile);
  if (!to) return [];

  const found = [];

  if (await ensureTable()) {
    const rows = await query(
      `SELECT \`id\`, \`label\`, \`line\`, \`house_no\`, \`street\`, \`landmark\`, \`city\`, \`state\`, \`pincode\`, \`remote_id\`
         FROM \`${TABLE}\` WHERE \`mobile\` = ? ORDER BY \`id\` DESC LIMIT 20`,
      [to],
    ).catch(() => []);

    (rows || []).forEach((r) => found.push({
      id: `s${r.id}`,
      remoteId: r.remote_id || '',
      label: r.label || 'Saved address',
      line: r.line,
      houseNo: r.house_no || '',
      street: r.street || '',
      landmark: r.landmark || '',
      city: r.city || '',
      state: r.state || '',
      pincode: r.pincode || '',
    }));
  }

  // Where a technician has already been on this number.
  try {
    const visits = await query(
      `SELECT \`id\`, \`name\`, \`house_no\`, \`area\`, \`near_by\`, \`city\`, \`state\`, \`pincode\`
         FROM \`df_service_bookings\`
        WHERE \`mobile\` = ? AND \`house_no\` <> ''
        ORDER BY \`id\` DESC LIMIT 10`,
      [to],
    );
    (visits || []).forEach((v) => {
      const a = normaliseAddress({
        id: `v${v.id}`,
        name: v.name,
        houseNo: v.house_no,
        street: v.area,
        landmark: v.near_by,
        city: v.city,
        state: v.state,
        pincode: v.pincode,
      });
      if (a) found.push({ ...a, remoteId: '', label: a.label || 'Previous visit' });
    });
  } catch (err) {
    console.error('[addresses] past visits unreadable:', err.code || err.message);
  }

  // And where their orders were delivered.
  if (userId) {
    try {
      const orders = await query(
        'SELECT `sale_id`, `shipping_address` FROM `sale` WHERE `buyer` = ? ORDER BY `sale_id` DESC LIMIT 10',
        [String(userId)],
      );
      (orders || []).forEach((o) => {
        let row = {};
        try { row = JSON.parse(o.shipping_address || '{}'); } catch { return; }
        // Orders placed here store the address in parts; the older PHP orders
        // store it as address1/address2/zip. Both are read.
        const a = normaliseAddress({
          id: `o${o.sale_id}`,
          name: row.name || [row.firstname, row.lastname].filter(Boolean).join(' '),
          houseNo: row.house_no || row.address1,
          street: row.area || row.address2,
          landmark: row.near_by || row.landmark,
          city: row.city,
          state: row.state,
          pincode: row.c_pincode || row.pincode || row.zip,
        });
        if (a) found.push({ ...a, remoteId: '', label: a.label || 'Delivery address' });
      });
    } catch (err) {
      console.error('[addresses] past orders unreadable:', err.code || err.message);
    }
  }

  // One entry per actual address, in the order they were found: what the
  // service knows first, then visits, then deliveries.
  const seen = new Set();
  return found.filter((a) => {
    const key = fingerprint(a.line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

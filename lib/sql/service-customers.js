// What the service system calls this customer.
//
// A verified OTP comes back with the service's own customer id and, when they
// have one open, the id of their cart there. A booking filed through
// `add_lead_with_full_dtls.php` is filed against those ids, so they are kept
// when they arrive rather than being read once and thrown away — a booking may
// happen days later, on another device.
//
// `df_` table: created on first use, never part of the PHP site's schema.

import { queryOne, mutate } from '@/lib/db';

const TABLE = 'df_service_customers';
const store = globalThis;

async function ensureTable() {
  if (store.__dfServiceCustomers) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`mobile\` VARCHAR(20) NOT NULL PRIMARY KEY,
        \`cust_id\` VARCHAR(40) NULL,
        \`cart_id\` VARCHAR(40) NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfServiceCustomers = true;
    return true;
  } catch (err) {
    console.error('[service-customer] table unavailable:', err.code || err.message);
    return false;
  }
}

const tenDigits = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
};

const clean = (v) => String(v ?? '').trim().slice(0, 40);

/**
 * Keeps the service's ids for a number. An id that arrives empty does not
 * erase the one already held: a later sign-in without a cart must not lose the
 * customer id from an earlier one.
 */
export async function rememberServiceIds(mobile, { custId, cartId } = {}) {
  const to = tenDigits(mobile);
  if (!to || (!clean(custId) && !clean(cartId)) || !(await ensureTable())) return false;

  try {
    await mutate(
      `INSERT INTO \`${TABLE}\` (\`mobile\`, \`cust_id\`, \`cart_id\`) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`cust_id\` = COALESCE(NULLIF(VALUES(\`cust_id\`), ''), \`cust_id\`),
         \`cart_id\` = COALESCE(NULLIF(VALUES(\`cart_id\`), ''), \`cart_id\`)`,
      [to, clean(custId), clean(cartId)],
    );
    return true;
  } catch (err) {
    console.error('[service-customer] could not save the ids:', err.code || err.message);
    return false;
  }
}

/** `{ custId, cartId }` for a number, or empty strings. */
export async function serviceIdsFor(mobile) {
  const to = tenDigits(mobile);
  if (!to || !(await ensureTable())) return { custId: '', cartId: '' };

  const row = await queryOne(
    `SELECT \`cust_id\`, \`cart_id\` FROM \`${TABLE}\` WHERE \`mobile\` = ? LIMIT 1`,
    [to],
  ).catch(() => null);

  return { custId: row?.cust_id || '', cartId: row?.cart_id || '' };
}

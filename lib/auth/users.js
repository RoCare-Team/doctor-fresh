// Customer accounts, stored in the site's existing `user` table.
//
// That is the table the PHP storefront signs people in against
// (`SELECT * FROM user WHERE phone=? AND otp=?`) and registers them into, so
// an account created here works on the current site and vice versa. No column
// is added and no unrelated row is touched.
//
// (The separate `users` table is only used by the PHP guest-checkout OTP; it
// is not the account table.)

import crypto from 'node:crypto';
import { query, queryOne, mutate } from '@/lib/db';

const TABLE = process.env.DB_TABLE_USERS || 'user';

/** Every stored phone is the plain 10-digit number. */
export function normaliseMobile(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  // Tolerate the country code visitors often paste in.
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

export function normaliseEmail(input) {
  const value = String(input ?? '').trim().toLowerCase();
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value) ? value : null;
}

export function normaliseName(input) {
  const value = String(input ?? '').trim().replace(/\s+/g, ' ');
  return value.length >= 2 && value.length <= 100 ? value : null;
}

const SELECT = '`user_id` AS `id`, `username` AS `name`, `surname`, `email`, `phone`';

/**
 * A few numbers appear on more than one row (the PHP registration never
 * enforced uniqueness). The oldest row wins, which is the account the PHP
 * login would pick up first.
 */
export async function findUserByMobile(mobile) {
  return queryOne(
    `SELECT ${SELECT} FROM \`${TABLE}\` WHERE \`phone\` = ? ORDER BY \`user_id\` ASC LIMIT 1`,
    [mobile],
  );
}

export async function findUserByEmail(email) {
  if (!email) return null;
  return queryOne(
    `SELECT ${SELECT} FROM \`${TABLE}\` WHERE \`email\` = ? ORDER BY \`user_id\` ASC LIMIT 1`,
    [email],
  );
}

/**
 * Create the account, or complete the profile of one that already exists.
 *
 * The columns and their defaults match what the PHP registration writes, so
 * the admin panel and the rest of the site read the row as they always have.
 * `password` is a random value the visitor never sees — sign-in is by OTP on
 * both sites, and leaving the column null would break screens that expect it.
 */
export async function createOrUpdateUser({ mobile, name, email }) {
  const existing = await findUserByMobile(mobile);

  if (existing) {
    await mutate(
      `UPDATE \`${TABLE}\` SET \`username\` = ?, \`email\` = ?, \`last_login\` = ? WHERE \`user_id\` = ?`,
      [name ?? existing.name ?? null, email ?? existing.email ?? null, String(nowSeconds()), existing.id],
    );
    return { ...existing, name: name ?? existing.name, email: email ?? existing.email };
  }

  const password = crypto.createHash('sha1').update(crypto.randomBytes(24)).digest('hex');

  const result = await mutate(
    `INSERT INTO \`${TABLE}\`
       (\`username\`, \`email\`, \`phone\`, \`password\`, \`langlat\`, \`wishlist\`,
        \`package_info\`, \`product_upload\`, \`creation_date\`, \`last_login\`)
     VALUES (?, ?, ?, ?, '', '[]', '[]', 1, ?, ?)`,
    [name ?? null, email ?? null, mobile, password, String(nowSeconds()), String(nowSeconds())],
  );

  return { id: result.insertId, mobile, phone: mobile, name, email };
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** `last_login` is a unix timestamp string, the same as the PHP site writes. */
export async function markSignedIn(id) {
  await mutate(`UPDATE \`${TABLE}\` SET \`last_login\` = ? WHERE \`user_id\` = ?`, [String(nowSeconds()), id]);
}

export async function countUsers() {
  const rows = await query(`SELECT COUNT(*) AS n FROM \`${TABLE}\``);
  return rows?.[0]?.n ?? null;
}

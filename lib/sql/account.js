// The signed-in customer's own data: profile, orders, wishlist.
//
// All of it lives in the tables the PHP site already uses — `user` for the
// profile and wishlist, `sale` for orders — so what a customer sees here is
// what the admin panel sees.

import { query, queryOne, mutate } from '@/lib/db';
import { readAddress, trimTail, tenDigits } from './address';

const USERS = process.env.DB_TABLE_USERS || 'user';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

/* ------------------------------------------------------------------ profile */

export async function getProfile(userId) {
  const row = await queryOne(
    `SELECT \`user_id\`, \`username\`, \`surname\`, \`email\`, \`phone\`,
            \`address1\`, \`address2\`, \`city\`, \`state\`, \`country\`, \`zip\`,
            \`creation_date\`, \`last_login\`
       FROM \`${USERS}\` WHERE \`user_id\` = ? LIMIT 1`,
    [userId],
  );
  if (!row) return null;

  return {
    id: row.user_id,
    firstName: row.username || '',
    lastName: row.surname || '',
    name: [row.username, row.surname].filter(Boolean).join(' '),
    email: row.email || '',
    mobile: row.phone || '',
    address1: row.address1 || '',
    address2: row.address2 || '',
    city: row.city || '',
    state: row.state || '',
    country: row.country || '',
    zip: row.zip || '',
    // Stored as a unix timestamp string.
    memberSince: row.creation_date ? new Date(num(row.creation_date) * 1000).toISOString() : null,
    lastLogin: row.last_login ? new Date(num(row.last_login) * 1000).toISOString() : null,
  };
}

/** Only the fields a customer may edit; the mobile number is their sign-in. */
const EDITABLE = ['username', 'surname', 'email', 'address1', 'address2', 'city', 'state', 'country', 'zip'];

export async function updateProfile(userId, fields) {
  const set = [];
  const values = [];

  for (const column of EDITABLE) {
    if (fields[column] === undefined) continue;
    set.push(`\`${column}\` = ?`);
    values.push(String(fields[column] ?? '').trim() || null);
  }
  if (!set.length) return;

  values.push(userId);
  await mutate(`UPDATE \`${USERS}\` SET ${set.join(', ')} WHERE \`user_id\` = ?`, values);
}

/* ------------------------------------------------------------------- orders */

function firstStatus(json, fallback) {
  try {
    const list = JSON.parse(json || '[]');
    return list[0]?.status || fallback;
  } catch {
    return fallback;
  }
}

/* --------------------------------------------------------- saved addresses */

/**
 * Addresses this customer can deliver to again, newest first: the ones they
 * have already had orders sent to, then the address on their profile. There is
 * no address book table, so the orders are the address book.
 *
 * Both stored shapes are read — PHP orders use firstname / address1 / zip,
 * orders placed here use name / house_no / c_pincode — and the result is the
 * shape checkout submits.
 */
export async function getSavedAddresses(userId) {
  const [rows, profile] = await Promise.all([
    query(
      'SELECT `shipping_address` FROM `sale` WHERE `buyer` = ? ORDER BY `sale_id` DESC LIMIT 30',
      [String(userId)],
    ),
    getProfile(userId),
  ]);

  const found = [];
  for (const row of rows || []) {
    let a;
    try {
      a = JSON.parse(row.shipping_address || '{}');
    } catch {
      continue;
    }
    found.push(readAddress(a));
  }

  if (profile?.address1) {
    const tail = [String(profile.zip || '').replace(/\D/g, ''), profile.state, profile.city, 'India'];
    found.push({
      name: profile.name,
      mobile: tenDigits(profile.mobile),
      email: profile.email,
      house_no: trimTail(profile.address1, tail, true),
      area: trimTail(profile.address2, tail),
      near_by: '',
      city: profile.city,
      state: profile.state,
      c_pincode: String(profile.zip || '').replace(/\D/g, '').slice(0, 6),
    });
  }

  // Only addresses complete enough to deliver to, and each place once.
  const seen = new Set();
  const addresses = found.filter((a) => {
    if (!a.house_no || !a.city || !/^\d{6}$/.test(a.c_pincode)) return false;
    const key = [a.house_no, a.area, a.c_pincode].join('|').toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    addresses: addresses.slice(0, 4),
    contact: {
      name: profile?.name || '',
      mobile: tenDigits(profile?.mobile),
      email: profile?.email || '',
    },
  };
}

/** Every order this customer has placed, newest first. */
export async function getOrdersForUser(userId) {
  const rows = await query(
    `SELECT \`sale_id\`, \`sale_code\`, \`product_details\`, \`payment_type\`,
            \`payment_status\`, \`delivery_status\`, \`vat\`, \`shipping\`,
            \`grand_total\`, \`created_at\`
       FROM \`sale\` WHERE \`buyer\` = ? ORDER BY \`sale_id\` DESC`,
    [String(userId)],
  );

  return (rows || []).map((row) => {
    let items = [];
    try {
      items = Object.values(JSON.parse(row.product_details || '{}'));
    } catch { /* a malformed row still shows its total */ }

    return {
      id: row.sale_id,
      code: row.sale_code,
      placedAt: row.created_at,
      paymentType: row.payment_type,
      paid: firstStatus(row.payment_status, 'due') === 'paid',
      delivery: firstStatus(row.delivery_status, 'pending'),
      total: num(row.grand_total),
      itemCount: items.reduce((n, i) => n + num(i.qty, 1), 0),
      items: items.map((i) => ({
        id: i.id, name: i.name, qty: num(i.qty, 1), subtotal: num(i.subtotal),
      })),
    };
  });
}

/* ----------------------------------------------------------------- wishlist */

/** `user.wishlist` is a JSON array of product ids. */
export async function getWishlistIds(userId) {
  const row = await queryOne(`SELECT \`wishlist\` FROM \`${USERS}\` WHERE \`user_id\` = ? LIMIT 1`, [userId]);
  try {
    const list = JSON.parse(row?.wishlist || '[]');
    return Array.isArray(list) ? list.map((id) => num(id)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function setWishlistIds(userId, ids) {
  await mutate(
    `UPDATE \`${USERS}\` SET \`wishlist\` = ? WHERE \`user_id\` = ?`,
    [JSON.stringify([...new Set(ids.map(String))]), userId],
  );
}

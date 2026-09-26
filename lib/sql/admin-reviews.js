// Product reviews for the admin: the PHP site's own `product_reviews` table.
//
// `status` 'ok' shows a review on the product page and '0' hides it (the
// storefront reads the same flag through isLive), so hiding is reversible and
// deleting is not. Ratings are stored to two decimals, which is how half stars
// — 4.50 — reach the star row on the page.

import { query, queryOne, mutate } from '@/lib/db';
import { TABLES } from './schema';

const TABLE = TABLES.productReviews;
const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const num = (v) => Number(v) || 0;

/** Between half a star and five, in half steps, as the star row can show. */
function rating(value) {
  const n = Math.round(Number(value) * 2) / 2;
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(0.5, n));
}

const LIVE = 'ok';
const HIDDEN = '0';

/** Every review, newest first, each with the product it belongs to. */
export async function listReviews({ limit = 500 } = {}) {
  const rows = await query(
    `SELECT r.\`product_reviews_id\`, r.\`product_id\`, r.\`user_name\`, r.\`rating\`,
            r.\`title\`, r.\`description\`, r.\`status\`, r.\`created_at\`,
            p.\`title\` AS \`product_title\`, p.\`slug\` AS \`product_slug\`
       FROM \`${TABLE}\` AS r
       LEFT JOIN \`${PRODUCTS}\` AS p ON p.\`product_id\` = r.\`product_id\`
      ORDER BY r.\`created_at\` DESC, r.\`product_reviews_id\` DESC
      LIMIT ?`,
    [Number(limit)],
  );
  if (rows === null) return null;

  return rows.map((r) => ({
    id: num(r.product_reviews_id),
    productId: num(r.product_id),
    productName: r.product_title || `Product #${num(r.product_id)}`,
    productHref: r.product_slug ? `/product/${r.product_slug}/${num(r.product_id)}` : null,
    author: r.user_name || '',
    rating: Number(r.rating) || 0,
    title: r.title || '',
    // Older rows were written by the PHP panel as HTML; the editor here works
    // in plain text, so the tags are stripped for it and never re-added.
    body: String(r.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    live: String(r.status ?? '').toLowerCase() !== HIDDEN,
    at: r.created_at ? new Date(r.created_at).getTime() : null,
  }));
}

/** The products a review can be written against. */
export async function reviewableProducts() {
  const rows = await query(
    `SELECT \`product_id\`, \`title\` FROM \`${PRODUCTS}\` ORDER BY \`title\` ASC`,
  );
  return (rows || []).map((r) => ({ id: num(r.product_id), name: r.title || `Product #${num(r.product_id)}` }));
}

function fields(body) {
  const author = clean(body.author, 255);
  const title = clean(body.title, 50);
  const text = clean(body.body, 5000);

  if (!author) return { error: 'Enter the reviewer’s name.' };
  if (!title) return { error: 'Enter a heading for the review.' };
  if (!text) return { error: 'Enter the review itself.' };

  return {
    author, title, text, stars: rating(body.rating),
  };
}

/** A review written in the admin, stored exactly as the PHP panel stores one. */
export async function createReview(body) {
  const productId = num(body.productId);
  if (!productId) return { error: 'Choose the product this review is about.' };

  const product = await queryOne(
    `SELECT \`product_id\` FROM \`${PRODUCTS}\` WHERE \`product_id\` = ? LIMIT 1`,
    [productId],
  );
  if (!product) return { error: 'That product no longer exists.' };

  const clean1 = fields(body);
  if (clean1.error) return clean1;

  // `created_at` is given rather than defaulted so a review can carry the date
  // it was actually left, which is what the product page shows.
  const when = clean(body.date, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(when) ? `${when} 12:00:00` : null;

  const result = await mutate(
    `INSERT INTO \`${TABLE}\`
       (\`user_rating_id\`, \`product_id\`, \`user_name\`, \`rating\`, \`title\`,
        \`description\`, \`most_helpful\`, \`status\`, \`created_at\`)
     VALUES (0, ?, ?, ?, ?, ?, 0, ?, ${date ? '?' : 'NOW()'})`,
    date
      ? [productId, clean1.author, clean1.stars, clean1.title, clean1.text, LIVE, date]
      : [productId, clean1.author, clean1.stars, clean1.title, clean1.text, LIVE],
  );

  return { ok: true, id: num(result?.insertId) };
}

export async function updateReview(id, body) {
  const set = [];
  const values = [];
  const put = (column, value) => { set.push(`\`${column}\` = ?`); values.push(value); };

  if (body.live !== undefined) put('status', body.live ? LIVE : HIDDEN);

  // Anything beyond visibility is a full edit, so it is validated as one.
  const editing = ['author', 'title', 'body', 'rating'].some((k) => body[k] !== undefined);
  if (editing) {
    const clean1 = fields(body);
    if (clean1.error) return clean1;
    put('user_name', clean1.author);
    put('title', clean1.title);
    put('description', clean1.text);
    put('rating', clean1.stars);
  }
  if (body.productId !== undefined && num(body.productId)) put('product_id', num(body.productId));

  if (!set.length) return { ok: true };
  values.push(num(id));
  await mutate(`UPDATE \`${TABLE}\` SET ${set.join(', ')} WHERE \`product_reviews_id\` = ?`, values);
  return { ok: true };
}

export async function deleteReview(id) {
  const row = await queryOne(
    `SELECT \`product_reviews_id\` FROM \`${TABLE}\` WHERE \`product_reviews_id\` = ? LIMIT 1`,
    [num(id)],
  );
  if (!row) return { error: 'That review no longer exists.' };

  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`product_reviews_id\` = ?`, [num(id)]);
  return { ok: true };
}

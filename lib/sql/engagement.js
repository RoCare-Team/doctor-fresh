// The rest of what the PHP site lets a visitor do: wishlist, quotations,
// product ratings, blog comments and cancelling an order.
//
// Every one writes to the table Home.php writes to, so the admin panel sees
// them exactly as it does today:
//
//   wishlist        →  user.wishlist        (wishlist add/remove)
//   quotation       →  quotation            (get_quotation)
//   product rating  →  user_rating + product.rating_num/rating_total
//                                            (ajax_post_user_rating)
//   blog comment    →  comment              (save_comment_ajax)
//   comment reply   →  comment_reply        (save_reply_ajax)
//   order cancel    →  sale.delivery_status (order_cancel)

import { query, queryOne, mutate } from '@/lib/db';
import { getWishlistIds, setWishlistIds } from './account';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

/* ---------------------------------------------------------------- wishlist */

/** Adds or removes a product. Returns the resulting list. */
export async function toggleWishlist(userId, productId) {
  const id = num(productId);
  if (!id) return null;

  const ids = await getWishlistIds(userId);
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

  await setWishlistIds(userId, next);
  return { ids: next, saved: next.includes(id) };
}

/* --------------------------------------------------------------- quotation */

/** "Get a quotation" on a product page. */
export async function createQuotation({ productId, name, email, phone }) {
  const result = await mutate(
    `INSERT INTO \`quotation\` (\`product_id\`, \`name\`, \`email\`, \`phone\`, \`status\`, \`created_at\`)
     VALUES (?, ?, ?, ?, 'no', NOW())`,
    [num(productId), clean(name), clean(email), clean(phone, 15)],
  );
  return result.insertId;
}

/* ---------------------------------------------------------- product rating */

/**
 * One rating per customer per product, as `ajax_post_user_rating` enforces:
 * an existing row is updated rather than added, and the product's running
 * totals are adjusted by the difference so the average stays correct.
 */
export async function rateProduct({ userId, productId, rating, comment, userName }) {
  const id = num(productId);
  const score = Math.min(5, Math.max(1, num(rating)));
  if (!id || !score) return { ok: false, reason: 'Choose a rating between 1 and 5.' };

  const existing = await queryOne(
    "SELECT `rating_id`, `rating` FROM `user_rating` WHERE `user_id` = ? AND `product_id` = ? AND `product_type` = 'product' LIMIT 1",
    [userId, id],
  );

  const previous = existing ? num(existing.rating) : 0;

  if (existing) {
    await mutate(
      'UPDATE `user_rating` SET `rating` = ?, `comment` = ?, `updated_at` = NOW() WHERE `rating_id` = ?',
      [score, clean(comment, 5000), existing.rating_id],
    );
  } else {
    await mutate(
      `INSERT INTO \`user_rating\` (\`user_id\`, \`product_id\`, \`product_type\`, \`rating\`, \`comment\`, \`created_at\`, \`updated_at\`)
       VALUES (?, ?, 'product', ?, ?, NOW(), NOW())`,
      [userId, id, score, clean(comment, 5000)],
    );
  }

  // The product row carries the running total and count the storefront reads.
  await mutate(
    `UPDATE \`${PRODUCTS}\`
        SET \`rating_total\` = GREATEST(COALESCE(\`rating_total\`, 0) - ? + ?, 0),
            \`rating_num\` = COALESCE(\`rating_num\`, 0) + ?
      WHERE \`product_id\` = ?`,
    [previous, score, existing ? 0 : 1, id],
  );

  // A written review is also shown in the reviews list.
  if (clean(comment) && !existing) {
    await mutate(
      `INSERT INTO \`product_reviews\`
         (\`user_rating_id\`, \`product_id\`, \`user_name\`, \`rating\`, \`title\`, \`description\`, \`most_helpful\`, \`status\`, \`created_at\`)
       VALUES (0, ?, ?, ?, '', ?, 0, 'ok', NOW())`,
      [id, clean(userName, 255) || 'Customer', score, clean(comment, 5000)],
    );
  }

  return { ok: true };
}

/* ----------------------------------------------------------- blog comments */

/** Comments are keyed by the article's absolute URL, as the PHP site stores them. */
export async function getComments(url) {
  const rows = await query(
    "SELECT `id`, `name`, `comment`, `created_at` FROM `comment` WHERE `url` = ? AND `status` <> '0' ORDER BY `id` DESC",
    [clean(url, 500)],
  );
  if (!rows?.length) return [];

  const replies = await query(
    `SELECT \`id\`, \`comment_id\`, \`name\`, \`reply\`, \`created_at\`
       FROM \`comment_reply\` WHERE \`comment_id\` IN (${rows.map(() => '?').join(',')}) AND \`status\` <> '0'
      ORDER BY \`id\` ASC`,
    rows.map((r) => r.id),
  );

  const byComment = new Map();
  for (const r of replies || []) {
    if (!byComment.has(r.comment_id)) byComment.set(r.comment_id, []);
    byComment.get(r.comment_id).push({
      id: r.id, name: r.name, body: r.reply, at: r.created_at,
    });
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    body: r.comment,
    at: r.created_at,
    replies: byComment.get(r.id) || [],
  }));
}

/** Links inside a comment are stripped, as the PHP handler does. */
const withoutLinks = (text) => String(text ?? '').replace(/<\/?a( [^>]*)?>/gi, '').trim();

export async function createComment({ url, name, email, comment }) {
  const result = await mutate(
    `INSERT INTO \`comment\` (\`name\`, \`email\`, \`url\`, \`comment\`, \`status\`, \`date_time\`, \`created_at\`)
     VALUES (?, ?, ?, ?, '1', NOW(), NOW())`,
    [clean(name), clean(email), clean(url, 500), withoutLinks(comment).slice(0, 20_000)],
  );
  return result.insertId;
}

export async function createCommentReply({ commentId, url, name, email, reply }) {
  const result = await mutate(
    `INSERT INTO \`comment_reply\` (\`comment_id\`, \`name\`, \`email\`, \`url\`, \`reply\`, \`status\`, \`date_time\`, \`created_at\`)
     VALUES (?, ?, ?, ?, ?, '1', NOW(), NOW())`,
    [num(commentId), clean(name), clean(email), clean(url, 500), withoutLinks(reply).slice(0, 20_000)],
  );
  return result.insertId;
}

/* ------------------------------------------------------------ order cancel */

/**
 * Marks an order cancelled, the same shape `order_cancel()` writes. Only the
 * buyer's own order, and only while it has not shipped.
 */
export async function cancelOrder({ saleId, userId }) {
  const row = await queryOne(
    'SELECT `buyer`, `delivery_status` FROM `sale` WHERE `sale_id` = ? LIMIT 1',
    [saleId],
  );
  if (!row) return { ok: false, reason: 'Order not found.' };
  if (String(row.buyer) !== String(userId)) return { ok: false, reason: 'Order not found.' };

  let statuses;
  try {
    statuses = JSON.parse(row.delivery_status || '[]');
  } catch {
    statuses = [];
  }

  const current = statuses[0]?.status || 'pending';
  if (['delivered', 'shipped'].includes(current)) {
    return { ok: false, reason: 'This order has already shipped. Please call +91-9311587716.' };
  }
  if (current === 'order cancelled') return { ok: true };

  const next = statuses.length
    ? statuses.map((s) => ({ ...s, status: 'order cancelled' }))
    : [{ admin: '', status: 'order cancelled', comment: '', delivery_time: '' }];

  await mutate('UPDATE `sale` SET `delivery_status` = ? WHERE `sale_id` = ?', [JSON.stringify(next), saleId]);
  return { ok: true };
}

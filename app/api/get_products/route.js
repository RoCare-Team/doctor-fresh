// GET /api/get_products — the catalogue as a flat JSON array:
//
//   [{ id, products_title, sale_price, purchase_price, url }, …]
//
// The same shape the PHP site's `get_products()` returns, field for field and
// in the same order, so anything already reading that endpoint can be pointed
// here without a change at the other end.
//
// Every row of `product` is included, as the PHP version does — a product that
// is switched off on the site still appears. `?live=1` leaves those out for a
// caller that only wants what is actually for sale.
//
// The whole catalogue comes back in one answer unless a page is asked for:
// `?limit=50&page=2` (or `&offset=50`) sends it a slice at a time, which is
// what an importer on a slow connection wants. The body is the same array
// either way, so nothing on the other end has to change; how many there are in
// total is in the `X-Total-Count` header.

import { query } from '@/lib/db';
import { SITE_URL } from '@/lib/utils';

// Read at request time: prices change in the admin and a frozen copy would
// quietly serve yesterday's.
export const dynamic = 'force-dynamic';

const HEADERS = {
  // Other systems read this list, so it is open to any origin.
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
};

/**
 * A whole number inside its range, or null when it was not asked for.
 *
 * The emptiness check comes first because `Number(null)` is 0, not NaN — which
 * would read a missing `offset` as "start at 0" and silently cancel `page`.
 */
function size(value, { min = 1, max = 500 } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const liveOnly = params.get('live') === '1';

  const limit = size(params.get('limit'));
  const page = size(params.get('page')) || 1;
  // `offset` wins when both are given: it says exactly where to start.
  const offset = size(params.get('offset'), { min: 0, max: 1e6 }) ?? (limit ? (page - 1) * limit : 0);

  const where = liveOnly ? "WHERE `status` = 'ok'" : '';
  const rows = await query(
    `SELECT \`product_id\`, \`title\`, \`slug\`, \`sale_price\`, \`purchase_price\`
       FROM \`product\`
      ${where}
      ORDER BY \`product_id\`
      ${limit ? 'LIMIT ? OFFSET ?' : ''}`,
    limit ? [limit, offset] : [],
  );

  // How many there are in all, so a caller paging through knows when to stop.
  const counted = limit
    ? await query(`SELECT COUNT(*) AS \`n\` FROM \`product\` ${where}`)
    : null;
  const total = counted ? Number(counted[0]?.n || 0) : (rows?.length ?? 0);

  // A failed read must not look like an empty catalogue, or whoever imports
  // this would wipe their own list.
  if (rows === null) {
    return Response.json(
      { error: 'The product list is unavailable right now.' },
      { status: 503, headers: { ...HEADERS, 'Cache-Control': 'no-store' } },
    );
  }

  const products = rows.map((p) => ({
    id: p.product_id,
    products_title: p.title,
    sale_price: p.sale_price,
    purchase_price: p.purchase_price,
    url: `${SITE_URL}/product/${p.slug}/${p.product_id}`,
  }));

  return Response.json(products, {
    headers: {
      ...HEADERS,
      'X-Total-Count': String(total),
      'Access-Control-Expose-Headers': 'X-Total-Count',
    },
  });
}

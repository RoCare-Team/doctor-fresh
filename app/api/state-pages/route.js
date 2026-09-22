// GET /api/state-pages?city=Asansol   (or ?state=West Bengal)
//
// Every published service page for a city (its locality pages included) or
// for a whole state, grouped by the kind of page, as JSON:
//
//   { success, scope: "city:Asansol", category_count, url_count,
//     categories: [{ category, count, urls: [{ url, meta_keywords }] }] }
//
// Read from `landing_pages`. The "category" is the page address without its
// place: ro-service-asansol → ro-service, water-cooled-chiller-asansol →
// water-cooled-chiller, ro-service-vikaspuri-delhi → ro-service.

import { query } from '@/lib/db';
import { SITE_URL } from '@/lib/utils';

// Read at request time; the CDN keeps each answer for an hour.
export const dynamic = 'force-dynamic';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

/** The page's address with its place taken off the end. */
function categoryOf(row) {
  const url = String(row.page_url || '');
  const places = [row.city, row.parent_city, row.state]
    .map(slugify)
    .filter((p) => p && p !== '0')
    .sort((a, b) => b.length - a.length); // "vikaspuri-delhi" before "delhi"
  for (const place of places) {
    if (url.endsWith(`-${place}`) && url.length > place.length + 1) return url.slice(0, -(place.length + 1));
  }
  // The all-India pages carry no place in their address, so the address is
  // the category (/dm-plant-manufacturers sits with dm-plant-manufacturers-asansol).
  if (/^india$/i.test(String(row.city || '').trim())) return url;
  // A locality whose name does not survive as-is in the address
  // (ro-service-fort-st.-george): its service is the category.
  return slugify(row.service_type) || url;
}

const fail = (message, status = 400) => Response.json(
  {
    success: false, scope: null, category_count: 0, url_count: 0, categories: [], message,
  },
  { status, headers: { ...HEADERS, 'Cache-Control': 'no-store' } },
);

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const city = clean(params.get('city')).slice(0, 100);
  const state = clean(params.get('state')).slice(0, 100);
  if (!city && !state) return fail('Pass a city or a state, e.g. /api/state-pages?city=Asansol or ?state=West Bengal.');

  const rows = await query(
    city
      ? `SELECT \`page_id\`, \`page_url\`, \`meta_keywords\`, \`service_type\`, \`city\`, \`parent_city\`, \`state\`
           FROM \`landing_pages\`
          WHERE \`status\` = 'ok' AND (LOWER(TRIM(\`city\`)) = LOWER(?) OR LOWER(TRIM(\`parent_city\`)) = LOWER(?))
          ORDER BY \`page_id\``
      : `SELECT \`page_id\`, \`page_url\`, \`meta_keywords\`, \`service_type\`, \`city\`, \`parent_city\`, \`state\`
           FROM \`landing_pages\`
          WHERE \`status\` = 'ok' AND LOWER(TRIM(\`state\`)) = LOWER(?)
          ORDER BY \`page_id\``,
    city ? [city, city] : [state],
  );
  if (rows === null) return fail('The page list is unavailable right now.', 503);

  const groups = new Map();
  for (const row of rows) {
    if (!row.page_url) continue;
    const category = categoryOf(row);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ url: `${SITE_URL}/${row.page_url}`, meta_keywords: clean(row.meta_keywords) });
  }

  const categories = [...groups.entries()].map(([category, urls]) => ({ category, count: urls.length, urls }));
  return Response.json({
    success: true,
    scope: city ? `city:${city}` : `state:${state}`,
    category_count: categories.length,
    url_count: categories.reduce((n, c) => n + c.count, 0),
    categories,
  }, { headers: HEADERS });
}

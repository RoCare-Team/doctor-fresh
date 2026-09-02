// The sitemap, built from the database rather than shipped as a file.
//
// The live PHP site serves a sitemap index at /sitemap.xml pointing at
// /sitemaps/<name>.xml. Those exact paths are kept here — they are what Search
// Console has on file — but the contents are now read from `landing_pages`,
// `category`, `sub_category`, `product` and `blog`, so a page added in the
// admin panel appears in the sitemap without anyone editing XML.
//
// The split matches the live one: each service family gets its own file, and
// RO Service (7,126 rows, the largest by far) splits into city and locality
// pages the way it always has.

import { query } from '@/lib/db';
import { TABLES } from '@/lib/sql/schema';
import {
  getAllCategories, getAllBlogPosts, getBlogCategories, SUBCATEGORY_BRANDS,
} from '@/lib/catalog';
import { SITE_URL } from '@/lib/utils';

/* ------------------------------------------------------------------- groups */

/**
 * One entry per child sitemap of the `landing_pages` table, keyed by the file
 * name the live site already uses. `locality: false` selects the city pages of
 * a family, `true` the locality pages; omitted means the whole family.
 */
export const LANDING_SITEMAPS = [
  { file: 'ro-service-cities', serviceType: 'RO Service', locality: false },
  { file: 'ro-services-localities', serviceType: 'RO Service', locality: true },
  { file: 'water-purifier', serviceType: 'Water Purifier' },
  { file: 'ro-plant', serviceType: 'RO Plant' },
  { file: 'water-softener', serviceType: 'Water Softener' },
  { file: 'water-atm', serviceType: 'Water ATM' },
  { file: 'water-chiller', serviceType: 'Water Chiller' },
  // The trailing space is in the data, not a typo — matched exactly so the
  // 1,534 rows are found.
  { file: 'water-ionizer', serviceType: 'Water Ionizer ' },
  { file: 'dm-plant-manufacturer', serviceType: 'DM Plant' },
  { file: 'etp-plant', serviceType: 'ETP Plant' },
  { file: 'stp-sitemap', serviceType: 'STP Plant' },
];

/** Every child sitemap, in the order the index lists them. */
export const SITEMAP_FILES = [
  'main-sitemap',
  ...LANDING_SITEMAPS.map((g) => g.file),
  'products',
  'blogs',
];

/**
 * Pages that are not rows in any table. `/legal/…`, the cart, search and the
 * account pages are left out: robots.txt disallows them, and a sitemap must
 * not advertise what crawlers are told to skip.
 */
const STATIC_PATHS = [
  { path: '/', priority: '1.0' },
  { path: '/all-category', priority: '0.8' },
  { path: '/spare-parts', priority: '0.8' },
  { path: '/store-locator', priority: '0.7' },
  { path: '/contact', priority: '0.7' },
  { path: '/partner', priority: '0.6' },
  { path: '/careers', priority: '0.6' },
  { path: '/compare', priority: '0.5' },
];

/* ---------------------------------------------------------------------- xml */

const escape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

/** A `lastmod` only when the stored value is a real date. */
function lastmod(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return '';
  return `\n    <lastmod>${date.toISOString().slice(0, 10)}</lastmod>`;
}

/** `entries` are `{ path, lastmod?, priority? }`. */
export function urlsetXml(entries) {
  const urls = entries.map(({ path, lastmod: mod, priority }) => (
    `  <url>\n    <loc>${escape(SITE_URL + path)}</loc>${lastmod(mod)}${
      priority ? `\n    <priority>${priority}</priority>` : ''
    }\n  </url>`
  )).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function sitemapIndexXml(files) {
  const items = files.map((file) => (
    `  <sitemap>\n    <loc>${escape(`${SITE_URL}/sitemaps/${file}.xml`)}</loc>\n  </sitemap>`
  )).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

export function xmlResponse(body) {
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

/* ------------------------------------------------------------------ queries */

// `locality` is '0' on rows that cover a whole city rather than one locality.
const IS_LOCALITY = "(`locality` IS NOT NULL AND `locality` <> '' AND `locality` <> '0')";

/**
 * The URLs of one landing-page family. Returns null if the query failed, so
 * the caller can answer 503 rather than serve a sitemap that has silently lost
 * several thousand URLs.
 */
export async function landingEntries(group) {
  const filters = ["`status` = 'ok'", '`service_type` <=> ?'];
  if (group.locality === true) filters.push(IS_LOCALITY);
  if (group.locality === false) filters.push(`NOT ${IS_LOCALITY}`);

  const rows = await query(
    `SELECT \`page_url\`, \`updated_at\`, \`created_at\`
       FROM \`${TABLES.landingPages}\`
      WHERE ${filters.join(' AND ')}
      ORDER BY \`page_id\` ASC`,
    [group.serviceType],
  );
  if (rows === null) return null;

  return rows
    .filter((row) => row.page_url)
    .map((row) => ({
      path: `/${row.page_url}`,
      lastmod: row.updated_at || row.created_at,
      priority: '0.7',
    }));
}

/**
 * Landing pages belonging to no family above — the handful of national service
 * pages (/water-purifier-amc, /ro-plant-near-me, …). Catching them by
 * exclusion means a service type added later still reaches the sitemap.
 */
async function otherLandingEntries() {
  const known = [...new Set(LANDING_SITEMAPS.map((g) => g.serviceType))];
  const rows = await query(
    `SELECT \`page_url\`, \`updated_at\`, \`created_at\`
       FROM \`${TABLES.landingPages}\`
      WHERE \`status\` = 'ok'
        AND (\`service_type\` IS NULL
             OR \`service_type\` NOT IN (${known.map(() => '?').join(', ')}))
      ORDER BY \`page_id\` ASC`,
    known,
  );

  return (rows || [])
    .filter((row) => row.page_url)
    .map((row) => ({
      path: `/${row.page_url}`,
      lastmod: row.updated_at || row.created_at,
      priority: '0.8',
    }));
}

/** The home page, the catalogue tree, the standing pages and the one-offs. */
export async function mainEntries() {
  const [categories, blogCategories, others] = await Promise.all([
    getAllCategories(),
    getBlogCategories(),
    otherLandingEntries(),
  ]);

  const brands = Object.keys(SUBCATEGORY_BRANDS);

  // Category → its subcategories → the brand page under each, which is the
  // whole catalogue tree the mega menu links to.
  const categoryEntries = (categories || []).flatMap((category) => [
    { path: category.href, priority: '0.8' },
    ...(category.subcategories || []).flatMap((sub) => [
      { path: sub.href, priority: '0.7' },
      ...brands.map((brand) => ({ path: `${sub.href}/${brand}`, priority: '0.6' })),
    ]),
  ]);

  return [
    ...STATIC_PATHS,
    ...categoryEntries,
    ...others,
    { path: '/blogs', priority: '0.6' },
    ...(blogCategories || []).map((c) => ({ path: c.href, priority: '0.5' })),
  ];
}

/** Every product detail page. */
export async function productEntries() {
  const rows = await query(
    `SELECT \`slug\`, \`product_id\`, \`update_time\`, \`add_timestamp\`
       FROM \`${TABLES.products}\`
      ORDER BY \`product_id\` ASC`,
  );
  if (rows === null) return null;

  return rows
    .filter((row) => row.slug)
    .map((row) => ({
      path: `/product/${row.slug}/${row.product_id}`,
      lastmod: row.update_time || row.add_timestamp,
      priority: '0.7',
    }));
}

/** Blog posts, newest first. */
export async function blogEntries() {
  const posts = await getAllBlogPosts();
  return (posts || [])
    .filter((post) => post.slug)
    .map((post) => ({ path: post.url, lastmod: post.date, priority: '0.6' }));
}

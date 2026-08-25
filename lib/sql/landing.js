// Landing pages — the flat SEO URLs of the site.
//
// `landing_pages` holds 22,195 published rows: the national service pages
// (/water-purifier-service, /water-purifier-amc, …) and the per-city pages
// (/ro-service-mumbai, /water-purifier-abhanpur, …). Each row carries its own
// written content, meta tags, FAQs and product selection, which is what the
// PHP site renders. Nothing here is generated from a template.
//
// The table is far too large to hold in memory, so rows are fetched per slug
// and kept in a small LRU for the duration of a render.

import { query, queryOne, isDbEnabled } from '@/lib/db';
import { TABLES, UPLOADS_BASE, UPLOAD_DIRS } from './schema';
import { strip, delinkDomain, parseSeoSections, parseFaqs } from './html';

const COLUMNS = [
  'page_id', 'page_url', 'page_name', 'page_canonical', 'meta_title',
  'meta_keywords', 'meta_description', 'content', 'new_content', 'faqs',
  'faq_new', 'related_topics', 'image', 'video', 'product_slider',
  'service_type', 'city', 'state', 'locality', 'parent_city',
  'interlinking_name', 'schema_city',
].map((c) => `\`${c}\``).join(', ');

/* -------------------------------------------------------------------- cache */

const MAX_CACHED = 500;
const globalForLanding = globalThis;
globalForLanding.__dfLanding ??= new Map();
const cache = globalForLanding.__dfLanding;

function remember(slug, value) {
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
  cache.set(slug, value);
  return value;
}

/* ------------------------------------------------------------------ mapping */

function idList(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * `related_topics` is a JSON array of internal links. Older rows store plain
 * strings, newer ones objects, so both shapes are accepted.
 */
function parseRelated(value) {
  let list;
  try {
    list = JSON.parse(value || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (typeof item === 'string') return { name: strip(item), href: null };
      const name = strip(item?.name || item?.title || item?.text);
      const url = String(item?.url || item?.link || item?.href || '').trim();
      if (!name) return null;
      return { name, href: url ? delinkDomain(url) : null };
    })
    .filter(Boolean);
}

function bannerImage(file) {
  if (!file) return null;
  const v = String(file).trim();
  if (v.startsWith('http')) return v;
  return `${UPLOADS_BASE}/${UPLOAD_DIRS.page || 'page_image'}/${v}`;
}

export function mapLandingPage(row) {
  if (!row) return null;

  // Newer rows put the live copy in `new_content` / `faq_new`; the original
  // columns stay populated, so the newer one wins when it exists.
  const content = delinkDomain(row.new_content?.trim() ? row.new_content : row.content);
  const faqs = parseFaqs(row.faq_new?.trim() ? row.faq_new : row.faqs);

  const heading = strip(row.page_name);
  const sections = parseSeoSections(content);

  return {
    id: Number(row.page_id),
    slug: row.page_url,
    href: `/${row.page_url}`,
    heading: heading || sections[0]?.title || '',
    metaTitle: strip(row.meta_title) || heading,
    metaDescription: strip(row.meta_description),
    keywords: row.meta_keywords || '',
    canonical: row.page_canonical ? delinkDomain(row.page_canonical) : null,

    contentHtml: content,
    contentSections: sections,
    faqs,
    relatedTopics: parseRelated(row.related_topics),

    image: bannerImage(row.image),
    video: row.video || '',
    productIds: idList(row.product_slider),

    serviceType: strip(row.service_type),
    city: strip(row.city),
    state: strip(row.state),
    // `locality` is '0' on rows that are not locality-specific.
    locality: row.locality && row.locality !== '0' ? strip(row.locality) : '',
    parentCity: strip(row.parent_city),
    linkLabel: strip(row.interlinking_name) || heading,
    schemaCity: strip(row.schema_city) || strip(row.city),
  };
}

/* ------------------------------------------------------------------ queries */

/**
 * One published page. A handful of slugs have duplicate rows (the admin panel
 * allowed it); the lowest page_id wins, which is the row the PHP site serves.
 */
export async function getLandingPageFromDb(slug) {
  if (!isDbEnabled() || !slug) return null;
  if (cache.has(slug)) return cache.get(slug);

  const row = await queryOne(
    `SELECT ${COLUMNS} FROM \`${TABLES.landingPages}\`
      WHERE \`page_url\` = ? AND \`status\` = 'ok'
      ORDER BY \`page_id\` ASC LIMIT 1`,
    [slug],
  );

  return remember(slug, mapLandingPage(row));
}

/**
 * Slugs to prerender: every one-off page, plus the busiest slice of each
 * city family. The remaining ~21,000 render on demand and are then cached,
 * so the build stays workable without any URL 404ing.
 */
export async function getLandingSlugsForBuild(perFamily = 40) {
  if (!isDbEnabled()) return null;

  const families = await query(
    `SELECT \`service_type\`, COUNT(*) AS n
       FROM \`${TABLES.landingPages}\`
      WHERE \`status\` = 'ok'
      GROUP BY \`service_type\``,
  );
  if (families === null) return null;

  const slugs = [];

  for (const family of families) {
    const take = Math.min(Number(family.n) || 0, perFamily);
    if (!take) continue;

    // The full row is selected, not just the slug: the same rows are about to
    // be rendered, and warming the cache here turns one query per page into
    // one query per family. The account is shared with the live PHP site and
    // capped at 30 connections, so query volume matters.
    const rows = await query(
      `SELECT ${COLUMNS} FROM \`${TABLES.landingPages}\`
        WHERE \`status\` = 'ok' AND \`service_type\` <=> ?
        ORDER BY \`page_id\` ASC LIMIT ?`,
      [family.service_type, take],
    );

    for (const row of rows || []) {
      if (!cache.has(row.page_url)) remember(row.page_url, mapLandingPage(row));
      slugs.push(row.page_url);
    }
  }

  return [...new Set(slugs)];
}

/**
 * Internal links to the same service in neighbouring places. Same state first,
 * because that is what a visitor in that city would actually want.
 */
const NEARBY_POOL = 400;
globalForLanding.__dfNearby ??= new Map();
const nearbyCache = globalForLanding.__dfNearby;

/**
 * The link pool for one service family, fetched once and reused. Doing this
 * per page would add a query to every one of the 22,195 renders.
 */
async function nearbyPool(serviceType) {
  if (nearbyCache.has(serviceType)) return nearbyCache.get(serviceType);

  const rows = await query(
    `SELECT \`page_url\`, \`interlinking_name\`, \`city\`, \`state\`, \`page_name\`
       FROM \`${TABLES.landingPages}\`
      WHERE \`status\` = 'ok' AND \`service_type\` = ?
      ORDER BY \`page_id\` ASC
      LIMIT ?`,
    [serviceType, NEARBY_POOL],
  );

  const pool = (rows || []).map((r) => ({
    slug: r.page_url,
    href: `/${r.page_url}`,
    name: strip(r.interlinking_name) || strip(r.city) || strip(r.page_name),
    state: strip(r.state),
  }));

  nearbyCache.set(serviceType, pool);
  return pool;
}

export async function getNearbyLandingPages(page, limit = 24) {
  if (!isDbEnabled() || !page?.serviceType) return [];

  const pool = await nearbyPool(page.serviceType);
  const state = page.state || '';

  // Same state first — that is what a visitor in that city would want.
  return [...pool]
    .filter((p) => p.slug !== page.slug)
    .sort((a, b) => (b.state === state) - (a.state === state))
    .slice(0, limit)
    .map(({ state: _state, ...rest }) => rest);
}

export async function countLandingPages() {
  const rows = await query(
    `SELECT COUNT(*) AS n FROM \`${TABLES.landingPages}\` WHERE \`status\` = 'ok'`,
  );
  return rows?.[0]?.n ?? null;
}

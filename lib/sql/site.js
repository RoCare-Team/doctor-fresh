// Site-wide content: brand details, footer, home-page sections.
//
// The PHP site reads all of this from `general_settings`, `social_links`,
// `slides`, `category`, `product` and `landing_pages`, so the same rows drive
// it here. Anything that is purely a layout choice (which badge icons the
// theme shows, the field list of a form) stays in /data/site.js — those are
// not stored in the database on either site.

import { query, isDbEnabled } from '@/lib/db';
import { TABLES, UPLOADS_BASE } from './schema';
import { strip } from './html';
import { cached } from './cache';

/* ------------------------------------------------------------- settings map */

async function loadSettings() {
  const rows = await query('SELECT `type`, `value` FROM `general_settings`');
  if (rows === null) return null;
  return Object.fromEntries(rows.map((r) => [r.type, r.value ?? '']));
}

export function getSettings() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('settings', loadSettings);
}

/* ----------------------------------------------------------------- branding */

// The admin panel stores LinkedIn under a legacy 'google-plus' key too.
const SOCIAL_KEY = {
  facebook: 'facebook',
  twitter: 'twitter',
  instagram: 'instagram',
  youtube: 'youtube',
  linkedin: 'linkden',
  'google-plus': null,
};

async function loadBrand() {
  const [settings, socialRows] = await Promise.all([
    getSettings(),
    query('SELECT `type`, `value` FROM `social_links`'),
  ]);
  if (!settings) return null;

  const social = [];
  const seen = new Set();
  for (const row of socialRows || []) {
    const key = SOCIAL_KEY[row.type];
    if (!key || seen.has(key) || !row.value) continue;
    seen.add(key);
    social.push({ key, href: row.value });
  }

  const phone = strip(settings.contact_phone) || strip(settings.phone);

  return {
    // Shipped with the app rather than stored in the database — the settings
    // table's logo row points at an asset the current theme no longer uses.
    logo: '/images/logo2-trimmed.png',
    favicon: '/images/favicon.png',
    name: strip(settings.system_name) || 'Doctor Fresh',
    title: strip(settings.system_title) || strip(settings.system_name),
    tagline: strip(settings.meta_description),
    // SEO rows the admin panel already fills. `meta_keywords` is empty on the
    // live site too, so nothing is invented to fill the gap.
    keywords: strip(settings.meta_keywords),
    author: strip(settings.meta_author),
    phone,
    phoneRaw: phone.replace(/[^0-9+]/g, ''),
    email: strip(settings.contact_email),
    website: strip(settings.contact_website),
    // Rich text in the admin panel; the plain form is what the UI shows.
    about: strip(settings.footer_text),
    addressHtml: settings.contact_address || '',
    address: strip(settings.contact_address),
    contactAboutHtml: settings.contact_about || '',
    offices: parseOffices(settings.contact_address),
    whatsapp: phone ? `https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}` : '',
    social,
  };
}

/**
 * `contact_address` is edited as HTML in the admin panel and reads like
 * "<strong>Head Office:</strong> Unit No. 831 … <strong>Branch:</strong> …",
 * so each bold label starts a new office.
 */
function parseOffices(html) {
  if (!html) return [];

  const parts = String(html).split(/<strong>/i).slice(1);
  const offices = parts
    .map((part) => {
      const [rawLabel, ...rest] = part.split(/<\/strong>/i);
      const label = strip(rawLabel).replace(/:$/, '');
      const address = strip(rest.join(' '));
      return label && address ? { label, address } : null;
    })
    .filter(Boolean);

  // No bold labels — treat the whole value as one address.
  if (!offices.length && strip(html)) return [{ label: 'Address', address: strip(html) }];
  return offices;
}

export function getBrandFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('brand', loadBrand);
}

/* ------------------------------------------------------------- legal pages */

// The policy documents are settings rows keyed by their slug, which is also
// the URL the site serves them at.
const LEGAL_SLUGS = [
  'terms-and-conditions',
  'privacy-and-policy',
  'returns-and-refunds-policy',
  'shipping-policy',
  'billing-terms-and-conditions',
  'disclaimer',
];

/**
 * Older URLs for the same documents, still in the sitemap and still linked
 * from elsewhere. The PHP route accepts any spelling, so both keep working.
 */
const LEGAL_ALIASES = {
  'terms-conditions': 'terms-and-conditions',
  'privacy-policy': 'privacy-and-policy',
  return_policy: 'returns-and-refunds-policy',
  'return-policy': 'returns-and-refunds-policy',
  'refund-policy': 'returns-and-refunds-policy',
};

function titleCase(slug) {
  return slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function loadLegal() {
  const settings = await getSettings();
  if (!settings) return null;

  const pages = {};
  for (const slug of LEGAL_SLUGS) {
    const html = settings[slug];
    if (!html || !strip(html)) continue;
    pages[slug] = { slug, title: titleCase(slug), heading: titleCase(slug), html };
  }

  // The legacy spellings serve the same document under their own URL.
  for (const [alias, target] of Object.entries(LEGAL_ALIASES)) {
    if (pages[target] && !pages[alias]) {
      pages[alias] = { ...pages[target], slug: alias, canonical: `/legal/${target}` };
    }
  }

  return Object.keys(pages).length ? pages : null;
}

export function getLegalPagesFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('legal', loadLegal);
}

/* ------------------------------------------------------------- home slides */

async function loadHeroSlides() {
  const rows = await query(
    "SELECT `slides_id`, `button_text`, `button_link` FROM `slides` WHERE `status` = 'ok' ORDER BY `slides_id` DESC",
  );
  if (rows === null) return null;

  return rows.map((r) => ({
    src: `${UPLOADS_BASE}/slides_image/slides_${r.slides_id}.jpg`,
    alt: strip(r.button_text) || 'Doctor Fresh',
    href: r.button_link || null,
  }));
}

export function getHeroSlidesFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('slides', loadHeroSlides);
}

/* ------------------------------------------------- popular internal linking */

/**
 * The service and city links in the footer, taken from the landing pages that
 * actually exist rather than from a hand-kept list.
 */
async function loadPopularLinks() {
  const rows = await query(
    `SELECT \`page_url\`, \`interlinking_name\`, \`city\`, \`service_type\`
       FROM \`${TABLES.landingPages}\`
      WHERE \`status\` = 'ok' AND \`service_type\` IN ('RO Service', 'Water Purifier', 'AMC', 'Installation')
      ORDER BY \`page_id\` ASC
      LIMIT 200`,
  );
  if (rows === null) return null;

  const label = (r) => strip(r.interlinking_name) || strip(r.city) || r.page_url;
  const pick = (types, limit, useCityOnly = false) => rows
    .filter((r) => types.includes(strip(r.service_type)))
    .slice(0, limit)
    .map((r) => ({
      href: `/${r.page_url}`,
      label: useCityOnly ? (strip(r.city) || label(r)) : label(r),
    }));

  return {
    // The one-off national pages: AMC, installation, the service landing page.
    services: rows
      .filter((r) => ['AMC', 'Installation'].includes(strip(r.service_type)))
      .concat(rows.filter((r) => r.page_url === 'water-purifier-service'))
      .map((r) => ({ href: `/${r.page_url}`, label: label(r) }))
      .slice(0, 4),
    roServiceCities: pick(['RO Service'], 26),
    waterPurifierCities: pick(['Water Purifier'], 13, true),
  };
}

export function getPopularLinksFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('popular', loadPopularLinks);
}

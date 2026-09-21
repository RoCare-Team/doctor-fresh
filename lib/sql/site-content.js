// Editable site copy that used to be written into the code — for now the home
// page: its search listing (title, description, keywords, share image) and
// the hero banner (text, buttons, pictures).
//
// Kept as one JSON document per page in `df_site_content`, created on first
// use. Anything not yet saved falls back to the built-in copy, so the page
// looks exactly as before until someone edits it.

import { unstable_cache, revalidateTag } from 'next/cache';
import { query, queryOne, mutate } from '@/lib/db';
import {
  homeMeta, trustBadges as TRUST_BADGES, waterTest as WATER_TEST, contactPage as CONTACT, partnerPage as PARTNER,
  careers as CAREERS,
} from '@/data/site';

const TABLE = 'df_site_content';
const store = globalThis;
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);

export const HOME_DEFAULTS = {
  metaTitle: homeMeta.title,
  metaDescription: homeMeta.description,
  keywords: 'water purifier, RO water purifier, RO service, RO plant, water softener, water ionizer, Doctor Fresh',
  ogImage: '/images/banner5.png',
  eyebrow: 'Purity · Hygiene · Sanitation',
  headingLine1: 'Pure water for every',
  headingLine2: 'home, office & industry',
  intro: 'Water purifiers, RO plants, softeners, ionizers and water ATMs — backed by a nationwide service network, free installation and same-day RO service.',
  primaryLabel: 'Shop water purifiers',
  primaryHref: '/category/water-purifier',
  secondaryLabel: 'Book free water test',
  secondaryHref: '#water-test',
  banners: ['/images/banner5.png', '/images/banner4.png'],
};

async function ensureTable() {
  if (store.__dfSiteContentTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`content_key\` VARCHAR(60) NOT NULL PRIMARY KEY,
        \`value\` MEDIUMTEXT NOT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfSiteContentTable = true;
    return true;
  } catch (err) {
    console.error('[site-content] table unavailable:', err.code || err.message);
    return false;
  }
}

// Only a site path or an https address — never javascript: or data: links.
const safeHref = (v) => {
  const s = clean(v, 500);
  return /^(\/|#|https:\/\/)/.test(s) ? s : '';
};

function normaliseHome(input = {}) {
  const out = { ...HOME_DEFAULTS };
  for (const key of ['metaTitle', 'metaDescription', 'keywords', 'eyebrow', 'headingLine1', 'headingLine2', 'intro', 'primaryLabel', 'secondaryLabel']) {
    if (typeof input[key] === 'string') out[key] = clean(input[key], key === 'metaDescription' || key === 'intro' ? 400 : 200);
  }
  for (const key of ['primaryHref', 'secondaryHref', 'ogImage']) {
    if (typeof input[key] === 'string') out[key] = safeHref(input[key]);
  }
  if (Array.isArray(input.banners)) {
    out.banners = input.banners.map(safeHref).filter(Boolean).slice(0, 8);
  }
  return out;
}

/*
 * Reads go through Next's data cache rather than a per-process one: on Vercel
 * every server instance shares it, so a save (which drops the tag) reaches
 * every page at once — a page rebuilt on another instance never picks up
 * stale copy. Five minutes is only the safety net.
 */
const CONTENT_TAG = 'df-site-content';

const readRow = unstable_cache(
  async (key) => {
    if (!(await ensureTable())) return null;
    const row = await queryOne(`SELECT \`value\` FROM \`${TABLE}\` WHERE \`content_key\` = ? LIMIT 1`, [key]);
    return row?.value ? String(row.value) : null;
  },
  ['df-site-content'],
  { tags: [CONTENT_TAG], revalidate: 300 },
);

/** Drops the cached copy everywhere after a save. */
function forgetContent() {
  try { revalidateTag(CONTENT_TAG); } catch { /* outside a request — nothing cached */ }
}

export async function getHomeContent() {
  try {
    const raw = await readRow('home');
    return raw ? normaliseHome(JSON.parse(raw)) : HOME_DEFAULTS;
  } catch (err) {
    console.error('[site-content] could not read the home content:', err.message);
    return HOME_DEFAULTS;
  }
}

export async function saveHomeContent(input) {
  if (!(await ensureTable())) return { error: 'The content table is not available.' };
  const value = normaliseHome(input);
  if (!value.metaTitle) return { error: 'Enter the meta title.' };
  if (!value.headingLine1 && !value.headingLine2) return { error: 'Enter the banner heading.' };
  if (!value.banners.length) return { error: 'Keep at least one banner picture.' };
  await mutate(
    `INSERT INTO \`${TABLE}\` (\`content_key\`, \`value\`) VALUES ('home', ?)
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [JSON.stringify(value)],
  );
  forgetContent();
  return { ok: true, value };
}

export async function lastHomeUpdate() {
  if (!(await ensureTable())) return null;
  const rows = await query(`SELECT \`updated_at\` FROM \`${TABLE}\` WHERE \`content_key\` = 'home' LIMIT 1`);
  return rows?.[0]?.updated_at || null;
}

/* ------------------------------------------------------------------------
   The rest of the site's editable copy — header menu, home sections, the
   contact / partner / careers pages and the footer — each one JSON document
   in the same table, with the built-in copy as the fallback.
   ------------------------------------------------------------------------ */


export const CONTENT_DEFAULTS = {
  nav: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Water Purifiers', href: '/category/water-purifier' },
      { label: 'RO Plant', href: '/category/ro-plant' },
      { label: 'Water Softener', href: '/category/water-softener' },
      { label: 'Water Ionizer', href: '/category/water-ionizer' },
      { label: 'Water ATM', href: '/category/water-atm' },
      { label: 'Service & AMC', href: '/water-purifier-service' },
      { label: 'Contact Us', href: '/contact' },
    ],
    ctaLabel: 'Become a Partner',
    ctaHref: '/partner',
    // The extra links in the phone menu, under the category list.
    mobileItems: [
      { label: 'All Products', href: '/all-category' },
      { label: 'Spare Parts', href: '/spare-parts' },
      { label: 'RO Repair & Service', href: '/water-purifier-service' },
      { label: 'Installation / Uninstallation', href: '/water-purifier-installation' },
      { label: 'AMC Plans', href: '/water-purifier-amc' },
      { label: 'Store Locator', href: '/store-locator' },
      { label: 'Become a Partner', href: '/partner' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  home_sections: {
    trustBadges: TRUST_BADGES.map((b) => ({ icon: b.icon, title: b.title })),
    waterTitle: WATER_TEST.title,
    waterFormTitle: WATER_TEST.formTitle,
    waterParameters: WATER_TEST.parameters.map((p) => ({ icon: p.icon, label: p.label })),
    highlights: ['Free installation', 'Same-day RO service', 'Service across India'],
  },
  pages: {
    contactMetaTitle: CONTACT.metaTitle || 'Contact Doctor Fresh',
    contactMetaDescription: CONTACT.metaDescription || 'Contact Doctor Fresh for water purifier sales, RO service, installation and AMC support across India.',
    contactHeading: 'Contact us',
    contactIntro: 'Sales, service, spare parts or partnership — reach the Doctor Fresh team directly. We respond to every enquiry within one working day.',
    contactFormTitle: CONTACT.formTitle,
    contactOtherInfoTitle: CONTACT.otherInfoTitle,
    partnerMetaTitle: PARTNER.metaTitle,
    partnerMetaDescription: PARTNER.metaDescription,
    partnerHeading: PARTNER.heading,
    partnerIntro: 'Partner with Doctor Fresh as a dealer, distributor or C&F / master franchise and build a water purification business in your territory.',
    partnerTabs: [...PARTNER.tabs],
    partnerBenefits: [
      { title: 'Growing category', text: 'Water treatment demand across domestic, commercial and industrial segments.' },
      { title: 'Full product range', text: 'Purifiers, RO plants, softeners, ionizers, ATMs, STP/ETP and spare parts.' },
      { title: 'Service backup', text: 'Trained technician network and genuine spare parts supply.' },
      { title: 'Territory support', text: 'Marketing material, pricing support and lead sharing in your area.' },
    ],
    partnerAsideTitle: 'Prefer to talk first?',
    partnerAsideText: 'Our channel team can walk you through investment, margins and territory availability.',
    careersMetaTitle: 'Careers',
    careersMetaDescription: 'Career opportunities at Doctor Fresh — join a growing Indian water purification brand.',
    careersTitle: CAREERS.title,
    careersIntro: CAREERS.intro,
    careersOpeningsTitle: 'Current openings',
    careersOpeningsText: 'Openings are published as they become available. Send your CV to our team and we will get in touch when a suitable role opens in your area.',
  },
  footer: {
    newsletterTitle: 'Stay Updated',
    newsletterText: 'Offers, new launches and water care tips — straight to your inbox.',
  },
  // Phone numbers / emails the team orders from while testing: their orders
  // are treated as test orders (hidden until "Show test orders"). Edited on
  // the Orders page, not in Site content.
  order_settings: {
    testContacts: [],
  },
};

/** A test contact as it is compared: an email in lower case, or a phone's last 10 digits. */
export function testContactKey(value) {
  const v = String(value ?? '').trim();
  if (v.includes('@')) return v.toLowerCase().slice(0, 120);
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

const text = (v, max) => (typeof v === 'string' ? clean(v, max) : undefined);

/** Keeps only known fields, trimmed; unknown or unsafe values fall back to the default. */
function normalise(key, input = {}) {
  const d = CONTENT_DEFAULTS[key];
  const out = structuredClone(d);
  if (key === 'nav') {
    for (const listKey of ['items', 'mobileItems']) {
      if (!Array.isArray(input[listKey])) continue;
      const list = input[listKey]
        .map((i) => ({ label: clean(i?.label, 40), href: safeHref(i?.href) }))
        .filter((i) => i.label && i.href)
        .slice(0, 16);
      if (list.length) out[listKey] = list;
    }
    out.ctaLabel = text(input.ctaLabel, 40) ?? d.ctaLabel;
    out.ctaHref = safeHref(input.ctaHref ?? d.ctaHref) || d.ctaHref;
  } else if (key === 'home_sections') {
    const iconList = (list, field) => list
      .map((i) => ({ icon: safeHref(i?.icon), [field]: clean(i?.[field], 60) }))
      .filter((i) => i[field])
      .slice(0, 12);
    if (Array.isArray(input.trustBadges)) out.trustBadges = iconList(input.trustBadges, 'title');
    if (Array.isArray(input.waterParameters)) out.waterParameters = iconList(input.waterParameters, 'label');
    if (Array.isArray(input.highlights)) out.highlights = input.highlights.map((h) => clean(h, 40)).filter(Boolean).slice(0, 3);
    out.waterTitle = text(input.waterTitle, 160) ?? d.waterTitle;
    out.waterFormTitle = text(input.waterFormTitle, 80) ?? d.waterFormTitle;
  } else if (key === 'pages') {
    for (const k of Object.keys(d)) {
      if (k === 'partnerBenefits') {
        if (Array.isArray(input.partnerBenefits)) {
          const list = input.partnerBenefits
            .map((b) => ({ title: clean(b?.title, 60), text: clean(b?.text, 200) }))
            .filter((b) => b.title)
            .slice(0, 8);
          if (list.length) out.partnerBenefits = list;
        }
      } else if (k === 'partnerTabs') {
        if (Array.isArray(input.partnerTabs)) {
          const tabs = input.partnerTabs.map((t) => clean(t, 60)).filter(Boolean).slice(0, 6);
          if (tabs.length) out.partnerTabs = tabs;
        }
      } else {
        out[k] = text(input[k], /Description|Intro|Text/.test(k) ? 600 : 160) ?? d[k];
      }
    }
  } else if (key === 'order_settings') {
    if (Array.isArray(input.testContacts)) {
      out.testContacts = [...new Set(input.testContacts.map(testContactKey).filter(Boolean))].slice(0, 30);
    }
  } else if (key === 'footer') {
    out.newsletterTitle = text(input.newsletterTitle, 80) ?? d.newsletterTitle;
    out.newsletterText = text(input.newsletterText, 300) ?? d.newsletterText;
  }
  return out;
}

/** One content document (shared cache, see above); the defaults until it is saved. */
export async function getContent(key) {
  if (!CONTENT_DEFAULTS[key]) throw new Error(`Unknown content key ${key}`);
  try {
    const raw = await readRow(key);
    return raw ? normalise(key, JSON.parse(raw)) : CONTENT_DEFAULTS[key];
  } catch (err) {
    console.error(`[site-content] could not read ${key}:`, err.message);
    return CONTENT_DEFAULTS[key];
  }
}

export async function saveContent(key, input) {
  if (!CONTENT_DEFAULTS[key]) return { error: 'Unknown section.' };
  if (!(await ensureTable())) return { error: 'The content table is not available.' };
  const value = normalise(key, input);
  await mutate(
    `INSERT INTO \`${TABLE}\` (\`content_key\`, \`value\`) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [key, JSON.stringify(value)],
  );
  forgetContent();
  return { ok: true, value };
}

/* --------------------------------------------------------------- legal pages */

// The policy pages are the PHP panel's own `general_settings` rows, keyed by
// the page's URL slug — edited here in place so both sites show the same text.

const LEGAL_PAGES = [
  ['terms-and-conditions', 'Terms and Conditions'],
  ['privacy-and-policy', 'Privacy Policy'],
  ['returns-and-refunds-policy', 'Returns and Refunds Policy'],
  ['shipping-policy', 'Shipping Policy'],
  ['billing-terms-and-conditions', 'Billing Terms and Conditions'],
  ['disclaimer', 'Disclaimer'],
];

export async function listLegalPages() {
  const rows = await query(
    `SELECT \`type\`, \`value\` FROM \`general_settings\` WHERE \`type\` IN (${LEGAL_PAGES.map(() => '?').join(', ')})`,
    LEGAL_PAGES.map(([slug]) => slug),
  );
  const bySlug = new Map((rows || []).map((r) => [r.type, r.value || '']));
  return LEGAL_PAGES.map(([slug, title]) => ({ slug, title, html: bySlug.get(slug) || '' }));
}

export async function saveLegalPage(slug, html) {
  if (!LEGAL_PAGES.some(([s]) => s === slug)) return { error: 'Unknown page.' };
  const value = String(html || '').slice(0, 200_000);
  const existing = await queryOne('SELECT `general_settings_id` FROM `general_settings` WHERE `type` = ? LIMIT 1', [slug]);
  if (existing) await mutate('UPDATE `general_settings` SET `value` = ? WHERE `type` = ?', [value, slug]);
  else await mutate('INSERT INTO `general_settings` (`type`, `value`) VALUES (?, ?)', [slug, value]);
  return { ok: true };
}

// Quick Links — the collapsible link groups at the foot of the home page
// ("RO Service Popular Cities", "Buy Water Purifier"…), managed in the admin.
//
// Each section keeps its chosen pages as a small JSON list of
// { id, slug, name } taken from `landing_pages` when they were added, so the
// home page never has to search that 22,000-row table to draw the links.

import { query, mutate } from '@/lib/db';

const TABLE = 'df_quick_links';
const store = globalThis;
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

export const QUICK_LINK_ICONS = [
  { id: 'link', label: 'Link 🔗' },
  { id: 'map-pin', label: 'Map Pin 📍' },
  { id: 'shopping-cart', label: 'Shopping Cart 🛒' },
  { id: 'wrench', label: 'Wrench 🔧' },
  { id: 'droplets', label: 'Water 💧' },
  { id: 'factory', label: 'Factory 🏭' },
  { id: 'building', label: 'Building 🏢' },
  { id: 'star', label: 'Star ⭐' },
];

async function ensureTable() {
  if (store.__dfQuickLinksTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(200) NOT NULL,
        \`icon\` VARCHAR(30) NOT NULL DEFAULT 'link',
        \`sort_id\` INT NOT NULL DEFAULT 0,
        \`pages\` MEDIUMTEXT NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfQuickLinksTable = true;
    return true;
  } catch (err) {
    console.error('[quick-links] table unavailable:', err.code || err.message);
    return false;
  }
}

const parsePages = (text) => {
  try {
    const list = JSON.parse(text || '[]');
    return Array.isArray(list) ? list.filter((p) => p && p.slug && p.name) : [];
  } catch {
    return [];
  }
};

/** Pages as sent from the admin: only the three fields kept, slugs made safe. */
const cleanPages = (pages) => (Array.isArray(pages) ? pages : [])
  .slice(0, 300)
  .map((p) => ({
    id: Number(p?.id) || 0,
    slug: clean(p?.slug, 255).replace(/^\/+/, '').replace(/[^a-z0-9-_/]/gi, ''),
    name: clean(p?.name, 255),
  }))
  .filter((p) => p.slug && p.name)
  .filter((p, i, a) => a.findIndex((q) => q.slug === p.slug) === i);

export async function listQuickLinks() {
  if (!(await ensureTable())) return null;
  const rows = await query(`SELECT * FROM \`${TABLE}\` ORDER BY \`sort_id\`, \`id\``);
  return rows
    ? rows.map((r) => ({
      id: r.id, title: r.title, icon: r.icon, sortId: Number(r.sort_id) || 0, pages: parsePages(r.pages),
    }))
    : null;
}

/* The home page reads this on every visit, so it is kept for five minutes and
   dropped whenever the admin saves. */
const TTL = 5 * 60_000;
export function forgetQuickLinks() {
  store.__dfQuickLinksCache = null;
}
export async function quickLinksForHome() {
  const hit = store.__dfQuickLinksCache;
  if (hit && Date.now() - hit.at < TTL) return hit.list;
  const list = await listQuickLinks().catch(() => null);
  if (list) store.__dfQuickLinksCache = { at: Date.now(), list: list.filter((s) => s.pages.length) };
  return store.__dfQuickLinksCache?.list || hit?.list || [];
}

function validate(input) {
  if (!clean(input.title)) return 'Enter the section title.';
  if (!cleanPages(input.pages).length) return 'Add at least one page to the section.';
  return '';
}

const iconOf = (v) => (QUICK_LINK_ICONS.some((i) => i.id === v) ? v : 'link');

export async function createQuickLink(input) {
  if (!(await ensureTable())) return { error: 'The quick links table is not available.' };
  const problem = validate(input);
  if (problem) return { error: problem };
  const result = await mutate(
    `INSERT INTO \`${TABLE}\` (\`title\`, \`icon\`, \`sort_id\`, \`pages\`) VALUES (?, ?, ?, ?)`,
    [clean(input.title, 200), iconOf(input.icon), Number(input.sortId) || 0, JSON.stringify(cleanPages(input.pages))],
  );
  return { ok: true, id: result.insertId };
}

export async function updateQuickLink(id, input) {
  if (!(await ensureTable())) return { error: 'The quick links table is not available.' };
  const problem = validate(input);
  if (problem) return { error: problem };
  await mutate(
    `UPDATE \`${TABLE}\` SET \`title\` = ?, \`icon\` = ?, \`sort_id\` = ?, \`pages\` = ? WHERE \`id\` = ?`,
    [clean(input.title, 200), iconOf(input.icon), Number(input.sortId) || 0, JSON.stringify(cleanPages(input.pages)), id],
  );
  return { ok: true };
}

export async function deleteQuickLink(id) {
  if (!(await ensureTable())) return { error: 'The quick links table is not available.' };
  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`id\` = ?`, [id]);
  return { ok: true };
}

/* ------------------------------------------------------ suggested sections */

// The cities most people search from, in the order they are listed.
const TOP_CITIES = [
  'delhi', 'noida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad', 'mumbai', 'bangalore', 'bengaluru',
  'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'chandigarh', 'indore',
];

const SUGGESTED = [
  { title: 'RO Service Popular Cities', icon: 'map-pin', type: 'RO Service' },
  { title: 'Buy Water Purifier', icon: 'shopping-cart', type: 'Water Purifier' },
  { title: 'RO Plant', icon: 'factory', type: 'RO Plant' },
  { title: 'Water Softener', icon: 'droplets', type: 'Water Softener' },
];

/**
 * Creates the usual sections — each linking a service's city pages for the
 * big cities — skipping any whose title already exists. They can then be
 * edited or deleted like any other section.
 */
export async function addSuggestedQuickLinks() {
  if (!(await ensureTable())) return { error: 'The quick links table is not available.' };
  const existing = (await listQuickLinks()) || [];
  const have = new Set(existing.map((s) => s.title.toLowerCase()));
  let order = existing.reduce((max, s) => Math.max(max, s.sortId), -1);
  const added = [];

  for (const s of SUGGESTED) {
    if (have.has(s.title.toLowerCase())) continue;
    // eslint-disable-next-line no-await-in-loop
    const rows = await query(
      `SELECT \`page_id\`, \`page_url\`, \`page_name\`, \`interlinking_name\`, \`city\`
         FROM \`landing_pages\`
        WHERE TRIM(\`service_type\`) = ? AND \`status\` = 'ok'
          AND LOWER(TRIM(\`city\`)) IN (${TOP_CITIES.map(() => '?').join(', ')})
          AND (\`locality\` IS NULL OR \`locality\` IN ('', '0'))
        ORDER BY \`page_id\``,
      [s.type, ...TOP_CITIES],
    );
    const rank = (r) => TOP_CITIES.indexOf(String(r.city || '').trim().toLowerCase());
    const pages = (rows || [])
      .sort((a, b) => rank(a) - rank(b))
      .map((r) => ({ id: r.page_id, slug: r.page_url, name: String(r.interlinking_name || r.page_name || '').replace(/\s*@\d{10}\s*/, ' ').trim() }));
    if (!pages.length) continue;

    order += 1;
    // eslint-disable-next-line no-await-in-loop
    const res = await createQuickLink({ title: s.title, icon: s.icon, sortId: order, pages });
    if (res.ok) added.push(s.title);
  }
  return { ok: true, added };
}

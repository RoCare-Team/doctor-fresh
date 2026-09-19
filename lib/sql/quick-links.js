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

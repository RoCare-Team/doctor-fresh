// Store / GMB locations — the branches on /store-locator.
//
// These used to be written into the code (data/site.js), as they are on the
// PHP site, so nobody could change them without a developer. They now live in
// `df_locations`, created on first use and filled once with those same
// branches, so the page looks the same until someone edits it.

import { query, mutate } from '@/lib/db';
import { stores as SEED } from '@/data/site';

const TABLE = 'df_locations';
const store = globalThis;

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

async function ensureTable() {
  if (store.__dfLocationsTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`city\` VARCHAR(120) NOT NULL,
        \`branch\` VARCHAR(200) NOT NULL,
        \`address\` VARCHAR(600) NOT NULL,
        \`time\` VARCHAR(120) NOT NULL DEFAULT '',
        \`map_link\` VARCHAR(600) NOT NULL DEFAULT '',
        \`map_embed\` TEXT NULL,
        \`phone\` VARCHAR(30) NOT NULL DEFAULT '',
        \`sort_id\` INT NOT NULL DEFAULT 0,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_city\` (\`city\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    // First run only: the branches the site already shows.
    const [{ n }] = await query(`SELECT COUNT(*) AS n FROM \`${TABLE}\``);
    if (!Number(n) && SEED?.length) {
      await mutate(
        `INSERT INTO \`${TABLE}\` (\`city\`, \`branch\`, \`address\`, \`time\`, \`sort_id\`) VALUES ${SEED.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
        SEED.flatMap((s, i) => [s.city, `Doctor Fresh ${s.city}`, s.address, s.hours || '', i + 1]),
      );
    }
    store.__dfLocationsTable = true;
    return true;
  } catch (err) {
    console.error('[locations] table unavailable:', err.code || err.message);
    return false;
  }
}

/**
 * Only an embed from Google Maps is kept, and only its address — the page
 * builds its own <iframe>, so pasted HTML can never run on the site.
 */
export function embedSrc(value) {
  const text = String(value || '');
  const src = (text.match(/src=["']([^"']+)["']/i)?.[1] || text).trim();
  try {
    const url = new URL(src);
    if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname.startsWith('/maps/embed')) return url.toString();
  } catch { /* not a URL */ }
  return '';
}

const safeLink = (value) => {
  const v = clean(value, 600);
  return /^https?:\/\//i.test(v) ? v : '';
};

function row(r) {
  return {
    id: r.id,
    city: r.city,
    branch: r.branch,
    address: r.address,
    time: r.time,
    mapLink: r.map_link,
    mapEmbed: r.map_embed ? embedSrc(r.map_embed) : '',
    phone: r.phone,
    active: Number(r.active) === 1,
    sortId: Number(r.sort_id) || 0,
  };
}

/** Every location, in display order. `null` when the database cannot answer. */
export async function listLocations({ activeOnly = false } = {}) {
  if (!(await ensureTable())) return null;
  const rows = await query(
    `SELECT * FROM \`${TABLE}\` ${activeOnly ? 'WHERE `active` = 1' : ''} ORDER BY \`sort_id\`, \`id\``,
  );
  return rows ? rows.map(row) : null;
}

/* ------------------------------------------------- for the service pages */

// Read by every service page (22,000 of them), so the live list is kept for
// five minutes and dropped whenever the admin changes a location.
const CACHE_TTL = 5 * 60_000;

export function forgetLocations() {
  store.__dfLocationsCache = null;
}

async function liveLocations() {
  const hit = store.__dfLocationsCache;
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.list;
  const list = await listLocations({ activeOnly: true }).catch(() => null);
  if (list) store.__dfLocationsCache = { at: Date.now(), list };
  return list || hit?.list || [];
}

// The same city under the names people and Google use for it.
const ALIASES = {
  gurugram: 'gurgaon', 'new delhi': 'delhi', bengaluru: 'bangalore', bombay: 'mumbai', calcutta: 'kolkata',
  madras: 'chennai', 'navi mumbai': 'mumbai', poona: 'pune', trivandrum: 'thiruvananthapuram', 'greater noida': 'noida',
};
const norm = (v) => {
  const s = String(v || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return ALIASES[s] || s;
};

/**
 * Branches to show on a service page: those in its city (or locality / parent
 * city), else those in its state. A national page (no place, or "India")
 * shows every branch. Nothing is shown rather than a branch far away.
 */
export async function locationsForPlace({
  city, locality, parentCity, state,
} = {}) {
  const all = await liveLocations();
  if (!all.length) return { list: [], scope: 'none' };

  const places = [locality, city, parentCity].map(norm).filter((p) => p && p !== 'india');
  if (!places.length) return { list: all, scope: 'all' };

  const inCity = all.filter((l) => {
    const c = norm(l.city);
    const addr = ` ${norm(l.address)} `;
    return places.some((p) => c === p || addr.includes(` ${p} `));
  });
  if (inCity.length) return { list: inCity, scope: 'city' };

  const st = norm(state);
  if (st && st !== 'india') {
    const inState = all.filter((l) => ` ${norm(l.address)} `.includes(` ${st} `));
    if (inState.length) return { list: inState, scope: 'state' };
  }
  return { list: [], scope: 'none' };
}

function validate(input) {
  if (!clean(input.city)) return 'Enter the city name.';
  if (!clean(input.branch)) return 'Enter the branch name.';
  if (!clean(input.address)) return 'Enter the address.';
  if (input.mapLink && !safeLink(input.mapLink)) return 'The map link must start with https://';
  if (input.mapEmbed && !embedSrc(input.mapEmbed)) return 'The embed code must be a Google Maps embed (from Share → Embed a map).';
  return '';
}

const values = (input) => [
  clean(input.city, 120), clean(input.branch, 200), clean(input.address, 600), clean(input.time, 120),
  safeLink(input.mapLink), embedSrc(input.mapEmbed) || null, clean(input.phone, 30).replace(/[^\d+ -]/g, ''),
];

export async function createLocation(input) {
  if (!(await ensureTable())) return { error: 'The locations table is not available.' };
  const problem = validate(input);
  if (problem) return { error: problem };
  const [{ next }] = await query(`SELECT COALESCE(MAX(\`sort_id\`), 0) + 1 AS \`next\` FROM \`${TABLE}\``);
  const result = await mutate(
    `INSERT INTO \`${TABLE}\` (\`city\`, \`branch\`, \`address\`, \`time\`, \`map_link\`, \`map_embed\`, \`phone\`, \`sort_id\`, \`active\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...values(input), Number(next) || 1, input.active === false ? 0 : 1],
  );
  return { ok: true, id: result.insertId };
}

export async function updateLocation(id, input) {
  if (!(await ensureTable())) return { error: 'The locations table is not available.' };
  const problem = validate(input);
  if (problem) return { error: problem };
  await mutate(
    `UPDATE \`${TABLE}\` SET \`city\` = ?, \`branch\` = ?, \`address\` = ?, \`time\` = ?, \`map_link\` = ?,
       \`map_embed\` = ?, \`phone\` = ?, \`active\` = ? WHERE \`id\` = ?`,
    [...values(input), input.active === false ? 0 : 1, id],
  );
  return { ok: true };
}

export async function deleteLocation(id) {
  if (!(await ensureTable())) return { error: 'The locations table is not available.' };
  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`id\` = ?`, [id]);
  return { ok: true };
}

/**
 * Many at once, from the CSV import. Rows that fail the checks are reported
 * back by line; a branch already listed for the same city is skipped rather
 * than duplicated.
 */
export async function importLocations(rows) {
  if (!(await ensureTable())) return { error: 'The locations table is not available.' };
  const existing = (await listLocations()) || [];
  const seen = new Set(existing.map((l) => `${l.city}|${l.branch}`.toLowerCase()));
  const [{ next }] = await query(`SELECT COALESCE(MAX(\`sort_id\`), 0) AS \`next\` FROM \`${TABLE}\``);
  let sort = Number(next) || 0;

  const good = [];
  const errors = [];
  let skipped = 0;
  (Array.isArray(rows) ? rows : []).slice(0, 2000).forEach((r, i) => {
    const problem = validate(r);
    if (problem) { errors.push(`Row ${i + 1}: ${problem}`); return; }
    const key = `${clean(r.city)}|${clean(r.branch)}`.toLowerCase();
    if (seen.has(key)) { skipped += 1; return; }
    seen.add(key);
    sort += 1;
    good.push([...values(r), sort]);
  });

  // In chunks, so one import is a handful of statements, not one per row.
  for (let i = 0; i < good.length; i += 100) {
    const chunk = good.slice(i, i + 100);
    // eslint-disable-next-line no-await-in-loop
    await mutate(
      `INSERT INTO \`${TABLE}\` (\`city\`, \`branch\`, \`address\`, \`time\`, \`map_link\`, \`map_embed\`, \`phone\`, \`sort_id\`)
       VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
      chunk.flat(),
    );
  }
  return { ok: true, added: good.length, skipped, errors };
}

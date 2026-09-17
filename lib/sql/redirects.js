// Stored redirect rules, and the fast lookup the middleware runs on every page.
//
// They live in `df_redirects`, a table of this app's own. The PHP site never
// reads or writes it, and no table it does use is touched. The table is
// created the first time the admin screen or the middleware needs it, so no
// separate migration step exists to forget.

import {
  query, queryOnce, mutate,
} from '@/lib/db';
import {
  cleanPath, cleanDestination, sourceFor, validateRule, typeInfo, COLLECTIONS,
} from '@/lib/redirects';

const TABLE = 'df_redirects';
const cache = globalThis;

async function ensureTable() {
  if (cache.__dfRedirectTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`collection\` VARCHAR(20) NOT NULL DEFAULT 'pages',
        \`source\` VARCHAR(500) NOT NULL,
        \`destination\` VARCHAR(1000) NOT NULL DEFAULT '',
        \`type\` SMALLINT UNSIGNED NOT NULL DEFAULT 301,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_source\` (\`source\`(255)),
        KEY \`idx_collection\` (\`collection\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    cache.__dfRedirectTable = true;
    return true;
  } catch (err) {
    console.error('[redirects] could not prepare the table:', err.code || err.message);
    return false;
  }
}

function row(r) {
  return {
    id: r.id,
    collection: r.collection,
    source: r.source,
    destination: r.destination || '',
    type: Number(r.type),
    // Unix seconds, so the admin shows the change in Indian time whatever
    // clock the database runs on.
    updatedAt: r.updated_unix ? Number(r.updated_unix) * 1000 : null,
  };
}

export async function listRedirects() {
  if (!(await ensureTable())) return null;
  const rows = await query(
    `SELECT \`id\`, \`collection\`, \`source\`, \`destination\`, \`type\`,
            UNIX_TIMESTAMP(\`updated_at\`) AS \`updated_unix\`
       FROM \`${TABLE}\` ORDER BY \`updated_at\` DESC, \`id\` DESC`,
  );
  return rows ? rows.map(row) : null;
}

/** Validates, normalises and stores one rule. Returns { ok, redirect } or { ok: false, error }. */
export async function saveRedirect(input) {
  if (!(await ensureTable())) return { ok: false, error: 'The redirect table is not available.' };

  const type = Number(input.type);
  const { source, collection } = sourceFor(input.source, COLLECTIONS.some((c) => c.id === input.collection) ? input.collection : 'pages');
  const destination = typeInfo(type)?.needsDestination ? cleanDestination(input.destination) : '';

  const problem = validateRule({ source, destination, type });
  if (problem) return { ok: false, error: problem };

  // A rule that sends A to B while another sends B back to A would bounce
  // visitors between the two forever.
  if (typeInfo(type).needsDestination && destination.startsWith('/')) {
    const back = await query(
      `SELECT \`id\` FROM \`${TABLE}\` WHERE \`source\` = ? AND \`destination\` <> '' AND \`type\` IN (301, 302) LIMIT 1`,
      [cleanPath(destination)],
    );
    const other = back?.[0];
    if (other && Number(other.id) !== Number(input.id)) {
      const pointsBack = await query(`SELECT \`destination\` FROM \`${TABLE}\` WHERE \`id\` = ?`, [other.id]);
      if (pointsBack?.[0] && cleanPath(pointsBack[0].destination) === source) {
        return { ok: false, error: `${destination} already redirects back to ${source} — that would loop.` };
      }
    }
  }

  const clash = await query(`SELECT \`id\` FROM \`${TABLE}\` WHERE \`source\` = ? LIMIT 1`, [source]);
  const clashId = clash?.[0]?.id;
  if (clashId && Number(clashId) !== Number(input.id)) {
    return { ok: false, error: `A redirect for ${source} already exists — edit that one instead.` };
  }

  try {
    if (input.id) {
      await mutate(
        `UPDATE \`${TABLE}\` SET \`collection\` = ?, \`source\` = ?, \`destination\` = ?, \`type\` = ? WHERE \`id\` = ?`,
        [collection, source, destination, type, Number(input.id)],
      );
    } else {
      await mutate(
        `INSERT INTO \`${TABLE}\` (\`collection\`, \`source\`, \`destination\`, \`type\`) VALUES (?, ?, ?, ?)`,
        [collection, source, destination, type],
      );
    }
  } catch (err) {
    console.error('[redirects] save failed:', err.code || err.message);
    return { ok: false, error: 'Could not save the redirect. Please try again.' };
  }

  forgetRedirects();
  return { ok: true };
}

export async function deleteRedirects(ids) {
  const list = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!list.length) return { ok: false, error: 'Nothing selected.' };
  if (!(await ensureTable())) return { ok: false, error: 'The redirect table is not available.' };

  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`id\` IN (${list.map(() => '?').join(',')})`, list);
  forgetRedirects();
  return { ok: true, deleted: list.length };
}

/** Adds or updates many rules at once; an existing source is overwritten. */
export async function importRedirects(rows) {
  if (!(await ensureTable())) return { ok: false, error: 'The redirect table is not available.' };

  let added = 0;
  let updated = 0;
  const failed = [];

  for (const r of rows) {
    const problem = validateRule(r);
    if (problem) {
      failed.push(`${r.source || '(blank)'}: ${problem}`);
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await mutate(
        `INSERT INTO \`${TABLE}\` (\`collection\`, \`source\`, \`destination\`, \`type\`) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`collection\` = VALUES(\`collection\`), \`destination\` = VALUES(\`destination\`), \`type\` = VALUES(\`type\`)`,
        [r.collection, r.source, r.destination || '', Number(r.type)],
      );
      // MySQL reports 1 for an insert and 2 for an update of an existing row.
      if (result.affectedRows === 1) added += 1;
      else if (result.affectedRows === 2) updated += 1;
    } catch (err) {
      failed.push(`${r.source}: ${err.code || 'could not save'}`);
    }
  }

  forgetRedirects();
  return {
    ok: true, added, updated, failed,
  };
}

/* ---------------------------------------------------------- live lookup */

// How long the middleware trusts its copy of the rules. An admin change on the
// same server clears it at once; other instances catch up within this.
const TTL_MS = 30_000;

export function forgetRedirects() {
  cache.__dfRedirectMap = null;
}

async function loadMap() {
  const state = cache.__dfRedirectMap;
  if (state?.map && Date.now() - state.at < TTL_MS) return state.map;
  // Many requests arriving on a cold cache share one query.
  if (state?.loading) return state.loading;

  const loading = (async () => {
    if (!cache.__dfRedirectTable) await ensureTable();
    const rows = await queryOnce(`SELECT \`source\`, \`destination\`, \`type\` FROM \`${TABLE}\``);
    const map = new Map((rows || []).map((r) => [r.source, { destination: r.destination || '', type: Number(r.type) }]));
    // A failed read keeps the last good copy rather than dropping every rule.
    const usable = rows ? map : (state?.map || new Map());
    cache.__dfRedirectMap = { at: Date.now(), map: usable, loading: null };
    return usable;
  })();

  cache.__dfRedirectMap = { ...(state || {}), loading };
  try {
    return await loading;
  } catch {
    cache.__dfRedirectMap = { at: Date.now(), map: state?.map || new Map(), loading: null };
    return cache.__dfRedirectMap.map;
  }
}

/** The rule for a request path, or null. */
export async function redirectFor(pathname) {
  const map = await loadMap();
  if (!map.size) return null;
  return map.get(cleanPath(pathname)) || null;
}

// Who changed what in the admin, and when.
//
// Five people share this admin. Until now a price that moved, an order marked
// deleted or a page whose copy changed left no trace at all — the only way to
// answer "who did this?" was to ask everyone. Every write the admin makes now
// leaves one line here.
//
// Two rules keep it honest:
//   • it never gets in the way — a failure to write the log is swallowed, so
//     nothing a person was doing can fail because of bookkeeping;
//   • it is append-only — nothing in the admin edits or deletes a line, so the
//     record cannot be tidied up after the fact.
//
// `df_` table: created on first use, never part of the PHP site's schema.

import { query, mutate } from '@/lib/db';

const TABLE = 'df_activity';
const store = globalThis;

async function ensureTable() {
  if (store.__dfActivity) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`admin_id\` INT NULL,
        \`admin_name\` VARCHAR(120) NULL,
        \`section\` VARCHAR(40) NOT NULL,
        \`action\` VARCHAR(20) NOT NULL,
        \`target_id\` VARCHAR(40) NULL,
        \`target\` VARCHAR(255) NULL,
        \`detail\` TEXT NULL,
        \`at_ms\` BIGINT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`created_at\` (\`created_at\`),
        KEY \`section\` (\`section\`),
        KEY \`admin_id\` (\`admin_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    // Added after the table shipped; an existing one is brought up to date.
    await mutate(`ALTER TABLE \`${TABLE}\` ADD COLUMN \`at_ms\` BIGINT NULL`)
      .catch(() => { /* already there */ });

    store.__dfActivity = true;
    return true;
  } catch (err) {
    console.error('[activity] table unavailable:', err.code || err.message);
    return false;
  }
}

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

/**
 * Records one change.
 *
 * `action` is what happened in plain words — 'created', 'edited', 'deleted',
 * 'marked done'. `target` is what it happened to, as a person would name it
 * ("Water Purifier", "Order 202610R179"), because an id alone tells a reader
 * nothing a month later. `detail` is the short "what changed" line.
 *
 * Never throws: the caller's own work has already succeeded by the time this
 * runs, and a log that could fail a save would be worse than no log.
 */
export async function logActivity({
  admin, section, action, targetId, target, detail,
} = {}) {
  try {
    if (!(await ensureTable())) return;
    await mutate(
      `INSERT INTO \`${TABLE}\`
        (\`admin_id\`, \`admin_name\`, \`section\`, \`action\`, \`target_id\`, \`target\`, \`detail\`, \`at_ms\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admin?.id ? Number(admin.id) : null,
        clean(admin?.name, 120),
        clean(section, 40),
        clean(action, 20),
        clean(targetId, 40) || null,
        clean(target),
        clean(detail, 1000) || null,
        // The database clock does not run on Indian time — this schema keeps
        // unix stamps for exactly that reason — so the moment is recorded here
        // rather than taken from CURRENT_TIMESTAMP.
        Date.now(),
      ],
    );
  } catch (err) {
    console.error('[activity] not recorded:', err.message);
  }
}

/**
 * What changed, newest first. `section` and `adminId` narrow it; `search`
 * matches the target or the detail, which is how somebody looks for one
 * product or one order.
 */
export async function listActivity({
  limit = 200, section = '', adminId = 0, search = '',
} = {}) {
  if (!(await ensureTable())) return [];

  const where = [];
  const params = [];
  if (section) { where.push('`section` = ?'); params.push(section); }
  if (adminId) { where.push('`admin_id` = ?'); params.push(Number(adminId)); }
  if (search) {
    where.push('(`target` LIKE ? OR `detail` LIKE ? OR `admin_name` LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const rows = await query(
    `SELECT * FROM \`${TABLE}\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY \`id\` DESC LIMIT ?`,
    [...params, Number(limit)],
  );

  return (rows || []).map((r) => ({
    id: r.id,
    adminId: r.admin_id,
    adminName: r.admin_name || 'Someone',
    section: r.section,
    action: r.action,
    targetId: r.target_id || '',
    target: r.target || '',
    detail: r.detail || '',
    at: Number(r.at_ms) || (r.created_at ? new Date(r.created_at).getTime() : null),
  }));
}

/** The people who appear in the log, for the "who" filter. */
export async function activityAdmins() {
  if (!(await ensureTable())) return [];
  const rows = await query(
    `SELECT \`admin_id\`, MAX(\`admin_name\`) AS \`name\`, COUNT(*) AS \`n\`
       FROM \`${TABLE}\` WHERE \`admin_id\` IS NOT NULL
      GROUP BY \`admin_id\` ORDER BY \`n\` DESC`,
  );
  return (rows || []).map((r) => ({ id: r.admin_id, name: r.name || `Admin ${r.admin_id}`, count: Number(r.n) }));
}

/**
 * "price ₹8,000 → ₹7,500, stock 4 → 2" — only the fields that actually moved.
 *
 * The admin forms post whole records, so without this every save would read as
 * if everything had changed.
 */
export function changedFields(before = {}, after = {}, fields = []) {
  const parts = [];
  for (const f of fields) {
    const key = typeof f === 'string' ? f : f.key;
    const label = typeof f === 'string' ? f : (f.label || f.key);
    if (after[key] === undefined) continue;

    const was = before[key] ?? '';
    const now = after[key] ?? '';
    if (String(was) === String(now)) continue;

    const show = (v) => {
      const s = String(v ?? '').replace(/\s+/g, ' ').trim();
      if (!s) return '(empty)';
      return s.length > 60 ? `${s.slice(0, 57)}…` : s;
    };
    parts.push(`${label}: ${show(was)} → ${show(now)}`);
  }
  return parts.join(', ');
}

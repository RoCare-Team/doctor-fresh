// Admin users and what each may do.
//
// People stay in the PHP panel's `admin` table (name, email, phone, SHA-1
// password), so every existing login keeps working and the PHP panel still
// sees them. What they may do in this admin lives beside it in
// `df_admin_access`, created on first use: role, sections, actions and an
// on/off switch. Someone with no row there gets a default from their PHP role
// (see legacyAccess).

import crypto from 'node:crypto';
import { query, queryOne, mutate } from '@/lib/db';
import {
  legacyAccess, cleanAccess, roleInfo,
} from '@/lib/admin/access';

const TABLE = 'df_admin_access';
const store = globalThis;

async function ensureTable() {
  if (store.__dfAccessTable) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`admin_id\` INT NOT NULL PRIMARY KEY,
        \`role\` VARCHAR(30) NOT NULL DEFAULT 'manager',
        \`sections\` TEXT NOT NULL,
        \`actions\` TEXT NOT NULL,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfAccessTable = true;
    return true;
  } catch (err) {
    console.error('[admin-users] could not create the access table:', err.code || err.message);
    return false;
  }
}

const parseList = (text) => {
  try {
    const list = JSON.parse(text || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/* ------------------------------------------------------------------ access */

// Read on every admin request, so it is kept for 30 seconds and dropped
// whenever someone's access is changed here.
const TTL = 30_000;

export function forgetAccess() {
  store.__dfAccessMap = null;
}

async function accessMap() {
  const hit = store.__dfAccessMap;
  if (hit && Date.now() - hit.at < TTL) return hit.map;
  if (!(await ensureTable())) return null;

  const rows = await query(`SELECT \`admin_id\`, \`role\`, \`sections\`, \`actions\`, \`active\` FROM \`${TABLE}\``);
  if (rows === null) return hit?.map || null;

  const map = new Map(rows.map((r) => [Number(r.admin_id), {
    ...cleanAccess({ role: r.role, sections: parseList(r.sections), actions: parseList(r.actions) }),
    active: Number(r.active) === 1,
  }]));
  store.__dfAccessMap = { at: Date.now(), map };
  return map;
}

/**
 * What this admin may do. Falls back to the PHP role when there is no row —
 * or when the table cannot be read, so a database hiccup never locks
 * everyone out of the admin.
 */
export async function getAccess(adminId, phpRole) {
  const map = await accessMap().catch(() => null);
  return map?.get(Number(adminId)) || legacyAccess(phpRole);
}

/* ------------------------------------------------------------------- users */

const sha1 = (text) => crypto.createHash('sha1').update(String(text)).digest('hex');
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const tenDigits = (v) => String(v ?? '').replace(/\D/g, '').slice(-10);

export async function listAdminUsers() {
  const [rows, map] = await Promise.all([
    query('SELECT `admin_id`, `name`, `email`, `phone`, `role`, `timestamp` FROM `admin` ORDER BY `admin_id`'),
    accessMap().catch(() => null),
  ]);
  if (rows === null) return null;

  return rows.map((r) => {
    const access = map?.get(Number(r.admin_id)) || legacyAccess(r.role);
    return {
      id: r.admin_id,
      name: r.name || '',
      email: r.email || '',
      phone: tenDigits(r.phone),
      createdAt: Number(r.timestamp) > 0 ? Number(r.timestamp) * 1000 : null,
      configured: Boolean(map?.has(Number(r.admin_id))),
      ...access,
    };
  });
}

async function emailTaken(email, exceptId = 0) {
  const rows = await query('SELECT `admin_id`, `email` FROM `admin`');
  const wanted = email.toLowerCase();
  return (rows || []).some((r) => Number(r.admin_id) !== Number(exceptId) && String(r.email || '').trim().toLowerCase() === wanted);
}

async function saveAccess(adminId, access, active) {
  await mutate(
    `INSERT INTO \`${TABLE}\` (\`admin_id\`, \`role\`, \`sections\`, \`actions\`, \`active\`)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`role\` = VALUES(\`role\`), \`sections\` = VALUES(\`sections\`),
       \`actions\` = VALUES(\`actions\`), \`active\` = VALUES(\`active\`)`,
    [adminId, access.role, JSON.stringify(access.sections), JSON.stringify(access.actions), active ? 1 : 0],
  );
  forgetAccess();
}

/** How many owners would still be able to sign in if `exceptId` changed. */
async function otherActiveOwners(exceptId) {
  const users = await listAdminUsers();
  return (users || []).filter((u) => Number(u.id) !== Number(exceptId) && u.active && u.role === 'owner').length;
}

function validate({ name, email, password }, { creating }) {
  if (!clean(name)) return 'Enter the name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(email))) return 'Enter a valid email — it is used to sign in.';
  if (creating || password) {
    if (String(password || '').length < 8) return 'The password needs at least 8 characters.';
  }
  return '';
}

/**
 * A new admin user. The password is stored the way the PHP panel stores it
 * (SHA-1), so the same login works in both panels. The PHP role column gets
 * '1' (its master) only for owners.
 */
export async function createAdminUser(input) {
  if (!(await ensureTable())) return { error: 'The access table is not available.' };
  const problem = validate(input, { creating: true });
  if (problem) return { error: problem };

  const email = clean(input.email).toLowerCase();
  if (await emailTaken(email)) return { error: 'Another admin already uses that email.' };

  const access = cleanAccess(input);
  if (!access.sections.length || !access.actions.length) return { error: 'Give at least one section and one permission.' };

  const result = await mutate(
    'INSERT INTO `admin` (`name`, `email`, `password`, `phone`, `role`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?)',
    [clean(input.name), email, sha1(input.password), tenDigits(input.phone), access.role === 'owner' ? '1' : '',
      String(Math.floor(Date.now() / 1000))],
  );
  await saveAccess(result.insertId, access, input.active !== false);
  return { ok: true, id: result.insertId };
}

export async function updateAdminUser(id, input, actingId) {
  if (!(await ensureTable())) return { error: 'The access table is not available.' };
  const row = await queryOne('SELECT `admin_id`, `role` FROM `admin` WHERE `admin_id` = ? LIMIT 1', [id]);
  if (!row) return { error: 'That user no longer exists.' };

  const problem = validate(input, { creating: false });
  if (problem) return { error: problem };
  const email = clean(input.email).toLowerCase();
  if (await emailTaken(email, id)) return { error: 'Another admin already uses that email.' };

  const access = cleanAccess(input);
  if (!access.sections.length || !access.actions.length) return { error: 'Give at least one section and one permission.' };
  const active = input.active !== false;

  // Nobody can lock themselves out, and there is always an owner left.
  if (Number(id) === Number(actingId)) {
    if (!active) return { error: 'You cannot switch off your own account.' };
    if (!access.sections.includes('users')) return { error: 'You cannot remove your own access to Admin users.' };
  }
  const current = await getAccess(id, row.role);
  if (current.role === 'owner' && current.active && (access.role !== 'owner' || !active) && !(await otherActiveOwners(id))) {
    return { error: 'This is the last active owner — make someone else an owner first.' };
  }

  const set = ['`name` = ?', '`email` = ?', '`phone` = ?'];
  const values = [clean(input.name), email, tenDigits(input.phone)];
  if (input.password) { set.push('`password` = ?'); values.push(sha1(input.password)); }
  // Kept in step for the PHP panel: owners are its master (1); a demoted
  // master loses that, anyone else keeps the PHP role they had.
  if (access.role === 'owner') { set.push('`role` = ?'); values.push('1'); } else if (String(row.role) === '1') { set.push('`role` = ?'); values.push(''); }
  values.push(id);

  await mutate(`UPDATE \`admin\` SET ${set.join(', ')} WHERE \`admin_id\` = ?`, values);
  await saveAccess(id, access, active);
  return { ok: true };
}

export async function setAdminActive(id, active, actingId) {
  const row = await queryOne('SELECT `admin_id`, `role` FROM `admin` WHERE `admin_id` = ? LIMIT 1', [id]);
  if (!row) return { error: 'That user no longer exists.' };
  if (!active && Number(id) === Number(actingId)) return { error: 'You cannot switch off your own account.' };

  const current = await getAccess(id, row.role);
  if (!active && current.role === 'owner' && !(await otherActiveOwners(id))) {
    return { error: 'This is the last active owner — make someone else an owner first.' };
  }
  if (!(await ensureTable())) return { error: 'The access table is not available.' };
  await saveAccess(id, current, active);
  return { ok: true };
}

export async function deleteAdminUser(id, actingId) {
  if (Number(id) === Number(actingId)) return { error: 'You cannot delete your own account.' };
  const row = await queryOne('SELECT `admin_id`, `role` FROM `admin` WHERE `admin_id` = ? LIMIT 1', [id]);
  if (!row) return { error: 'That user no longer exists.' };

  const current = await getAccess(id, row.role);
  if (current.role === 'owner' && current.active && !(await otherActiveOwners(id))) {
    return { error: 'This is the last active owner — make someone else an owner first.' };
  }

  await mutate('DELETE FROM `admin` WHERE `admin_id` = ?', [id]);
  if (await ensureTable()) await mutate(`DELETE FROM \`${TABLE}\` WHERE \`admin_id\` = ?`, [id]);
  forgetAccess();
  return { ok: true };
}

export { roleInfo };

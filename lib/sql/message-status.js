// How far a contact or partner message has got: new → in progress → resolved.
//
// `contact_message` has only a `view` flag — read or not — which cannot say
// that somebody has picked a message up but not finished with it. That middle
// state is what stops two people ringing the same customer, so it is kept in a
// `df_` table of our own beside the message.
//
// `view` is still written: 'yes' once a message is resolved, 'no' while it is
// not. The PHP panel and everything already counting unread messages therefore
// keep working exactly as before.

import { query, mutate } from '@/lib/db';
import { MESSAGE_STATUSES } from '@/lib/admin/message-status';

const TABLE = 'df_message_status';
const store = globalThis;

const KNOWN = new Set(MESSAGE_STATUSES.map((s) => s.id));

async function ensureTable() {
  if (store.__dfMessageStatus) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`message_id\` INT NOT NULL PRIMARY KEY,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'new',
        \`updated_by\` VARCHAR(120) NULL,
        \`at_ms\` BIGINT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfMessageStatus = true;
    return true;
  } catch (err) {
    console.error('[message-status] table unavailable:', err.code || err.message);
    return false;
  }
}

/**
 * The status of every message that has one, as a Map.
 *
 * A message with no row has never been touched, which is exactly 'new' — with
 * one exception: anything the old panel had already marked read is counted as
 * resolved, so the switch to three states does not reopen years of messages.
 */
export async function messageStatusMap() {
  if (!(await ensureTable())) return new Map();
  const rows = await query(`SELECT \`message_id\`, \`status\`, \`updated_by\`, \`at_ms\` FROM \`${TABLE}\``);
  return new Map((rows || []).map((r) => [
    Number(r.message_id),
    { status: KNOWN.has(r.status) ? r.status : 'new', by: r.updated_by || '', at: Number(r.at_ms) || null },
  ]));
}

/** Reads one message's status, falling back to its old read flag. */
export function statusOf(map, id, handled) {
  return map.get(Number(id))?.status || (handled ? 'resolved' : 'new');
}

export async function setMessageStatus(id, status, by = '') {
  if (!KNOWN.has(status)) return { ok: false, reason: 'That is not a status a message can have.' };
  if (!(await ensureTable())) return { ok: false, reason: 'Could not save the status.' };

  await mutate(
    `INSERT INTO \`${TABLE}\` (\`message_id\`, \`status\`, \`updated_by\`, \`at_ms\`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`),
                             \`updated_by\` = VALUES(\`updated_by\`),
                             \`at_ms\` = VALUES(\`at_ms\`)`,
    [Number(id), status, String(by || '').slice(0, 120), Date.now()],
  );

  // The old read flag stays truthful for the PHP panel and the unread counts.
  await mutate(
    'UPDATE `contact_message` SET `view` = ? WHERE `contact_message_id` = ?',
    [status === 'resolved' ? 'yes' : 'no', Number(id)],
  ).catch(() => { /* the status itself is saved either way */ });

  return { ok: true };
}

// Comments and replies from the blog posts and service pages (Community Chat),
// for the admin: the PHP site's own `comment` and `comment_reply` tables.
//
// `status` '1' shows a row on the site and '0' hides it — the public reader
// (lib/sql/engagement.js) leaves '0' out — so hiding is reversible; deleting
// is not.

import { query, queryOne, mutate } from '@/lib/db';

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const TABLES = { comment: 'comment', reply: 'comment_reply' };

/** The page a stored URL points at, whatever host or .php form it was saved with. */
function pageOf(url) {
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    path = String(url || '');
  }
  path = path.replace(/\/+$/, '').replace(/\.php$/i, '') || '/';
  return { path, kind: path.startsWith('/blog/') ? 'blog' : 'service' };
}

const visible = (status) => String(status ?? '1') !== '0';

export async function listComments({ limit = 2000 } = {}) {
  const rows = await query(
    `SELECT \`id\`, \`name\`, \`email\`, \`url\`, \`comment\`, \`status\`, \`created_at\`
       FROM \`comment\` ORDER BY \`id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  if (rows === null) return null;
  if (!rows.length) return [];

  const replies = await query(
    `SELECT \`id\`, \`comment_id\`, \`name\`, \`email\`, \`reply\`, \`status\`, \`created_at\`
       FROM \`comment_reply\` WHERE \`comment_id\` IN (${rows.map(() => '?').join(',')}) ORDER BY \`id\` ASC`,
    rows.map((r) => r.id),
  );
  const byComment = new Map();
  for (const r of replies || []) {
    if (!byComment.has(r.comment_id)) byComment.set(r.comment_id, []);
    byComment.get(r.comment_id).push({
      id: r.id, name: r.name || '', email: r.email || '', body: r.reply || '', visible: visible(r.status),
      at: r.created_at ? new Date(r.created_at).getTime() : null,
    });
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name || '',
    email: r.email || '',
    body: r.comment || '',
    visible: visible(r.status),
    at: r.created_at ? new Date(r.created_at).getTime() : null,
    ...pageOf(r.url),
    replies: byComment.get(r.id) || [],
  }));
}

/** Shows or hides one comment or reply on the site. */
export async function setVisible(kind, id, show) {
  const table = TABLES[kind];
  if (!table) return { error: 'Unknown item.' };
  await mutate(`UPDATE \`${table}\` SET \`status\` = ? WHERE \`id\` = ?`, [show ? '1' : '0', Number(id)]);
  return { ok: true };
}

/** Deletes a reply, or a comment together with its replies. */
export async function deleteItem(kind, id) {
  if (kind === 'reply') {
    await mutate('DELETE FROM `comment_reply` WHERE `id` = ?', [Number(id)]);
  } else if (kind === 'comment') {
    await mutate('DELETE FROM `comment_reply` WHERE `comment_id` = ?', [Number(id)]);
    await mutate('DELETE FROM `comment` WHERE `id` = ?', [Number(id)]);
  } else {
    return { error: 'Unknown item.' };
  }
  return { ok: true };
}

/** A reply from the team, shown under the comment at once. */
export async function replyAsTeam({ commentId, text, name, email }) {
  const body = clean(text, 5000).replace(/<\/?a( [^>]*)?>/gi, '');
  if (body.length < 2) return { error: 'Write the reply first.' };
  const parent = await queryOne('SELECT `id`, `url` FROM `comment` WHERE `id` = ? LIMIT 1', [Number(commentId)]);
  if (!parent) return { error: 'That comment no longer exists.' };
  const result = await mutate(
    `INSERT INTO \`comment_reply\` (\`comment_id\`, \`name\`, \`email\`, \`url\`, \`reply\`, \`status\`, \`date_time\`, \`created_at\`)
     VALUES (?, ?, ?, ?, ?, '1', NOW(), NOW())`,
    [parent.id, clean(name, 80) || 'Doctor Fresh Team', clean(email, 120), parent.url, body],
  );
  return { ok: true, id: result.insertId };
}

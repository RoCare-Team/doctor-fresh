// Deleting a customer's account, as the privacy policy promises
// (/legal/app-privacy-policy, /legal/delete-account).
//
// The `user` row is anonymised rather than removed: orders in `sale` keep the
// buyer's id, and orders and invoices must stay for tax and GST purposes.
// What identifies the person — name, phone, email, addresses, wishlist — is
// cleared, so the row no longer signs in or matches their number, and a new
// sign-up with the same number starts a fresh account.
//
// Blog comments and replies they posted under their email stay on the site
// with the name shown as "Anonymous". Product reviews are stored by display
// name only, with no link to the account, so they cannot be matched safely
// and are left as they are.

import crypto from 'node:crypto';
import { queryOne, mutate } from '@/lib/db';

const USERS = process.env.DB_TABLE_USERS || 'user';

/** Returns true once the account is anonymised, false when there was none. */
export async function deleteAccount(userId) {
  const row = await queryOne(`SELECT \`user_id\`, \`email\` FROM \`${USERS}\` WHERE \`user_id\` = ? LIMIT 1`, [userId]);
  if (!row) return false;

  const password = crypto.createHash('sha1').update(crypto.randomBytes(24)).digest('hex');
  await mutate(
    `UPDATE \`${USERS}\`
        SET \`username\` = 'Deleted user', \`surname\` = NULL, \`email\` = NULL, \`phone\` = '',
            \`address1\` = NULL, \`address2\` = NULL, \`city\` = NULL, \`state\` = NULL,
            \`country\` = NULL, \`zip\` = NULL, \`langlat\` = '', \`wishlist\` = '[]',
            \`password\` = ?, \`last_login\` = ?
      WHERE \`user_id\` = ?`,
    [password, String(Math.floor(Date.now() / 1000)), userId],
  );

  const email = String(row.email || '').trim();
  if (email) {
    await mutate("UPDATE `comment` SET `name` = 'Anonymous', `email` = '' WHERE `email` = ?", [email]).catch(() => {});
    await mutate("UPDATE `comment_reply` SET `name` = 'Anonymous', `email` = '' WHERE `email` = ?", [email]).catch(() => {});
  }

  console.info(`[account] user ${userId} deleted at their request`);
  return true;
}

/**
 * A deleted account keeps its row but no longer has a phone number. No row at
 * all (or the database not answering) is not taken as deleted, so an outage
 * never signs everyone out.
 */
export async function isDeletedAccount(userId) {
  const row = await queryOne(`SELECT \`phone\` FROM \`${USERS}\` WHERE \`user_id\` = ? LIMIT 1`, [userId]);
  return Boolean(row) && !String(row.phone || '').trim();
}

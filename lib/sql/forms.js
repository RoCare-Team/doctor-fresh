// Enquiries and form submissions.
//
// Everything a visitor fills in goes to the table the PHP site writes it to,
// so it reaches the same admin panel:
//
//   service booking / enquiry  →  leads              (landing_page 'do_add')
//   request a callback         →  request_call_back  (landing_page 'request_call_back')
//   contact form               →  contact_message    (contact 'send')
//   newsletter                 →  subscribe          (subscribe)
//
// The dropdowns are read from the same tables the PHP views populate them
// from — `ro_status`, `ro_status_query`, `ro_units`, `states` and `cities`.

import { query, mutate } from '@/lib/db';
import { cached } from './cache';

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

/* ------------------------------------------------------------- dropdowns */

async function loadOptions() {
  const [statuses, queries, units, states] = await Promise.all([
    query('SELECT `id`, `title` FROM `ro_status` WHERE `status` = 1 ORDER BY `id`'),
    query('SELECT `status_id`, `status_title`, `query_title` FROM `ro_status_query` WHERE `status` = 1 ORDER BY `query_id`'),
    query('SELECT `id`, `title` FROM `ro_units` WHERE `status` = 1 ORDER BY `id`'),
    query('SELECT `state_name` FROM `states` WHERE `status` = 1 ORDER BY `state_name`'),
  ]);
  if (statuses === null) return null;

  // "Query for" depends on the chosen RO status, so the options are grouped by
  // it and the browser filters without another round trip.
  const queriesByStatus = {};
  for (const row of queries || []) {
    const key = clean(row.status_title);
    (queriesByStatus[key] ??= []).push(clean(row.query_title));
  }

  return {
    roStatus: (statuses || []).map((r) => clean(r.title)),
    queriesByStatus,
    units: (units || []).map((r) => clean(r.title)),
    states: (states || []).map((r) => clean(r.state_name)),
  };
}

export function getFormOptions() {
  return cached('options', loadOptions);
}

/** Cities in one state, for the dependent dropdown. */
export async function getCities(state) {
  const name = clean(state, 50);
  if (!name) return [];

  const rows = await query(
    'SELECT `city_name` FROM `cities` WHERE `state_name` = ? ORDER BY `city_name`',
    [name],
  );
  return (rows || []).map((r) => clean(r.city_name));
}

/* ------------------------------------------------------- email notification */

// The PHP site mails these enquiries to the team from its own scripts. They
// answer 200 with an empty body whatever happens, so they cannot be used to
// tell the visitor whether anything worked — the database write is what is
// confirmed, and the mail is sent alongside it as a best effort.
const MAILERS = {
  contact: process.env.CONTACT_MAILER_URL || 'https://www.doctorfresh.in/send_email.php',
  partner: process.env.PARTNER_MAILER_URL || 'https://www.doctorfresh.in/email_partner.php',
};

/**
 * Posts the same fields the live form posts, so the existing script builds the
 * same email. Never throws and never blocks the caller's answer.
 */
export async function notifyByEmail(kind, fields) {
  const url = MAILERS[kind];
  if (!url) return;

  // Lets the flow be exercised in development without mailing the team.
  if (process.env.FORMS_EMAIL_DISABLED === 'true') {
    // eslint-disable-next-line no-console
    console.info('[forms] email skipped (FORMS_EMAIL_DISABLED):', kind);
    return;
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '')])),
      ),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(`[forms] ${kind} email failed:`, err.message);
  }
}

/* ----------------------------------------------------------------- writes */

/** A service booking or product enquiry from a landing page. */
export async function createLead({
  pageId, name, email, mobile, roStatus, queryFor, state, city, unit, bookDate, address,
}) {
  const result = await mutate(
    `INSERT INTO \`leads\`
       (\`page_id\`, \`name\`, \`email\`, \`mobile\`, \`ro_status\`, \`query_for\`,
        \`state\`, \`city\`, \`unit\`, \`book_date\`, \`address\`, \`status\`, \`created_at\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NOW())`,
    [
      Number(pageId) || 0,
      clean(name, 255),
      clean(email, 255) || null,
      clean(mobile, 15),
      clean(roStatus, 50) || null,
      clean(queryFor, 50) || null,
      clean(state, 50) || null,
      clean(city, 50) || null,
      clean(unit, 50) || null,
      // A `date` column rejects an empty string.
      /^\d{4}-\d{2}-\d{2}$/.test(String(bookDate ?? '')) ? bookDate : null,
      clean(address, 2000) || null,
    ],
  );
  return result.insertId;
}

export async function createCallbackRequest({ pageId, name, mobile, timing }) {
  const result = await mutate(
    `INSERT INTO \`request_call_back\` (\`page_id\`, \`name\`, \`mobile\`, \`timing\`, \`status\`, \`created_at\`)
     VALUES (?, ?, ?, ?, '', NOW())`,
    [Number(pageId) || 0, clean(name, 255), clean(mobile, 15), clean(timing, 20) || null],
  );
  return result.insertId;
}

/** The contact form. `timestamp` is a unix string, as the PHP site stores it. */
export async function createContactMessage({ name, email, subject, message }) {
  const result = await mutate(
    `INSERT INTO \`contact_message\` (\`name\`, \`email\`, \`subject\`, \`message\`, \`timestamp\`, \`view\`)
     VALUES (?, ?, ?, ?, ?, 'no')`,
    [
      clean(name, 100),
      clean(email, 200),
      clean(subject, 1000),
      clean(message, 20_000),
      String(Math.floor(Date.now() / 1000)),
    ],
  );
  return result.insertId;
}

/** Newsletter. Returns false when the address is already subscribed. */
export async function subscribeToNewsletter({ name, email }) {
  const address = clean(email, 600).toLowerCase();
  const existing = await query('SELECT `subscribe_id` FROM `subscribe` WHERE LOWER(`email`) = ? LIMIT 1', [address]);
  if (existing?.length) return false;

  await mutate('INSERT INTO `subscribe` (`name`, `email`) VALUES (?, ?)', [clean(name, 255), address]);
  return true;
}

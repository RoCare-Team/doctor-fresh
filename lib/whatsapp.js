// WhatsApp messages sent through the limbu.ai campaigns API.
//
//   WHATSAPP_API_KEY             the account's API key (required to send)
//   WHATSAPP_ORDER_CAMPAIGN      campaign for a placed order (default order_book)
//   WHATSAPP_TEAM_CAMPAIGN       campaign for the office alert (default product_order_confirm)
//   WHATSAPP_TEAM_NUMBERS        who gets those alerts, comma separated
//   WHATSAPP_API_URL             base URL (default https://whatsapp.limbu.ai/api/campaigns)
//
// Nothing here may cost a customer their order: a missing key, a slow API or a
// rejected message is logged and otherwise ignored.

const API_URL = (process.env.WHATSAPP_API_URL || 'https://whatsapp.limbu.ai/api/campaigns').replace(/\/+$/, '');
const TIMEOUT_MS = 10_000;

/** "Mohd Asim Khan" → ["Mohd", "Asim Khan"]; the template takes two names. */
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return [parts[0] || '', parts.slice(1).join(' ')];
}

/** A 10-digit Indian mobile with the country code the API expects. */
function destination(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : null;
}

async function sendCampaign(campaign, messages) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) {
    console.warn('[whatsapp] WHATSAPP_API_KEY is not set — message not sent');
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(campaign)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => '');

    if (!res.ok) {
      console.error(`[whatsapp] ${campaign} rejected (${res.status}):`, text.slice(0, 300));
      return { ok: false, status: res.status };
    }
    console.info(`[whatsapp] ${campaign} sent to ${messages.map((m) => m.destination).join(', ')}`);
    return { ok: true };
  } catch (err) {
    console.error(`[whatsapp] ${campaign} failed:`, err.name === 'TimeoutError' ? 'timed out' : err.message);
    return { ok: false };
  }
}

/**
 * The "order booked" message, to the number the order was placed with.
 * Template params, in order: first name, last name.
 */
export async function sendOrderPlacedWhatsApp({ name, mobile }) {
  const to = destination(mobile);
  if (!to) {
    console.warn('[whatsapp] order has no valid mobile number — message not sent');
    return { ok: false, skipped: true };
  }

  const [firstName, lastName] = splitName(name);
  return sendCampaign(process.env.WHATSAPP_ORDER_CAMPAIGN || 'order_book', [
    { destination: to, templateParams: [firstName, lastName] },
  ]);
}

/* ------------------------------------------------------------- the team */

/**
 * The office numbers a new enquiry or booking is announced to.
 *
 * A lead nobody sees is a lead lost: the admin inbox is only read when someone
 * thinks to read it, and a WhatsApp is read in a minute. Set
 * WHATSAPP_TEAM_NUMBERS to change who gets them; an empty value turns the
 * alerts off without touching the code.
 */
const TEAM = String(
  process.env.WHATSAPP_TEAM_NUMBERS
  ?? '6386103750,9899923643,8506097730,9319595499,7303888097',
)
  .split(',')
  .map((n) => destination(n))
  .filter(Boolean);

/**
 * Tells the team something came in.
 *
 * The template's own words decide what each value has to be: its fifth line
 * reads "Date & Time" and its sixth "Payment Type", so that is what goes in
 * them. Anything else there produces a message nobody can read — and the
 * details themselves are one tap away in the admin, which the template's last
 * line already points at.
 *
 * Never awaited by anything a customer is waiting on: an enquiry is saved
 * whether or not the alert goes out.
 */
const oneLine = (text, max = 700) => String(text ?? '')
  .replace(/s+/g, ' ')
  .trim()
  .slice(0, max);

/** "29 Sep 2026, 3:45 pm" — on the clock the office keeps. */
function nowInIndia() {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).replace(/s+/g, ' ');
}

export async function notifyTeam({
  what, name, mobile, email, detail,
}) {
  if (!TEAM.length) return { ok: false, skipped: true };

  const [firstName, lastName] = splitName(name);
  const params = [
    firstName || 'Customer',
    lastName || '',
    destination(mobile) ? String(mobile).replace(/\D/g, '').slice(-10) : '—',
    email || '—',
    // "Date & Time" — the moment, and what it was.
    oneLine(`${nowInIndia()} — ${what || 'New enquiry'}`, 120),
    // "Payment Type" — how it is paid for, then the short of it.
    oneLine(detail, 160) || '—',
  ];

  return sendCampaign(
    process.env.WHATSAPP_TEAM_CAMPAIGN || 'product_order_confirm',
    TEAM.map((to) => ({ destination: to, templateParams: params })),
  );
}

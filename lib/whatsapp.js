// WhatsApp messages sent through the limbu.ai campaigns API.
//
//   WHATSAPP_API_KEY             the account's API key (required to send)
//   WHATSAPP_ORDER_CAMPAIGN      campaign for a placed order (default order_book)
//   WHATSAPP_TEAM_CAMPAIGN       campaign for the office alert (default product_order_confirm)
//   WHATSAPP_TEAM_NUMBERS        who gets those alerts, comma separated
//   WHATSAPP_API_URL             base URL (default https://whatsapp.limbu.ai/api/campaigns)
//   WHATSAPP_BROCHURE_CAMPAIGN   campaign for a brochure download (default brochure_download)
//   WHATSAPP_BROCHURE_MEDIA_ID   a fixed uploaded document to attach instead of the
//                                product's own brochure (optional)
//
// Nothing here may cost a customer their order: a missing key, a slow API or a
// rejected message is logged and otherwise ignored.

import { SITE_URL } from '@/lib/utils';

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

async function sendCampaign(campaign, messages, extra = {}) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) {
    console.warn('[whatsapp] WHATSAPP_API_KEY is not set — message not sent');
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(campaign)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, ...extra, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => '');

    if (!res.ok) {
      console.error(`[whatsapp] ${campaign} rejected (${res.status}):`, text.slice(0, 300));
      return { ok: false, status: res.status };
    }
    // limbu.ai only queues the messages here ("queued", "invalid"); delivery
    // happens after, and its outcome is in their campaign report.
    let data = null;
    try {
      data = JSON.parse(text)?.data || null;
    } catch { /* not JSON */ }
    console.info(`[whatsapp] ${campaign} queued for ${messages.length} number(s): ${text.slice(0, 200)}`);
    return { ok: true, queued: Number(data?.queued ?? messages.length), invalid: Number(data?.invalid ?? 0) };
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

// WhatsApp refuses a template param that is empty or has a newline in it.
const oneLine = (text, max = 700) => String(text ?? '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

/** A saved address as one line: house, area, landmark, city, state, pin. */
export function addressLine(a = {}) {
  return [
    a.house_no || a.houseNo,
    a.area,
    a.landmark || a.nearBy,
    a.city,
    a.state,
    a.c_pincode || a.pincode || a.zip,
  ].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ');
}

/** What was bought and for how much: "RO Purifier x2, Filter — Total Rs 12999". */
export function orderDetail({ items = [], totals = {} }) {
  const list = items.map((i) => `${i.name}${Number(i.qty) > 1 ? ` x${i.qty}` : ''}`).join(', ');
  return `${list || 'order'} — Total Rs ${totals.grandTotal ?? 0}`;
}

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
  }).replace(/\s+/g, ' ');
}

/**
 * Tells the team something came in.
 *
 * The params follow the template's lines, in order:
 *   {{1}} Customer  {{2}} Mobile  {{3}} Address
 *   {{4}} Order Details  {{5}} Date & Time  {{6}} Payment Type
 * so each value is named after the line it fills. `what` ("New order #123",
 * "Website enquiry") leads the order details, so an enquiry reads as one.
 *
 * Never awaited by anything a customer is waiting on: an enquiry is saved
 * whether or not the alert goes out.
 */
export async function notifyTeam({
  what, name, mobile, address, order, payment,
}) {
  if (!TEAM.length) return { ok: false, skipped: true };

  const params = [
    oneLine(name, 60) || 'Customer',
    destination(mobile) ? String(mobile).replace(/\D/g, '').slice(-10) : '—',
    oneLine(address, 200) || '—',
    oneLine([what, order].filter(Boolean).join(' — '), 300) || '—',
    nowInIndia(),
    oneLine(payment, 60) || '—',
  ];

  return sendCampaign(
    process.env.WHATSAPP_TEAM_CAMPAIGN || 'product_order_confirm',
    TEAM.map((to) => ({ destination: to, templateParams: params })),
  );
}

/* ------------------------------------------------------------ brochures */

/**
 * The brochure a customer just downloaded, sent to their WhatsApp as the
 * template's document. Each product has its own brochure, built by
 * /api/brochure/<id>, so its address is attached; WHATSAPP_BROCHURE_MEDIA_ID
 * attaches one uploaded file to every message instead.
 *
 * Template params: first name.
 */
export async function sendBrochureWhatsApp({ name, mobile, productId, fileName }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const to = destination(mobile);
  if (!apiKey || !to) {
    if (!apiKey) console.warn('[whatsapp] WHATSAPP_API_KEY is not set — brochure not sent');
    return { ok: false, skipped: true };
  }

  const campaign = process.env.WHATSAPP_BROCHURE_CAMPAIGN || 'brochure_download';
  const site = SITE_URL;
  const fixedId = process.env.WHATSAPP_BROCHURE_MEDIA_ID;
  const media = fixedId
    ? { id: fixedId }
    // A fresh address each time: WhatsApp keeps a copy of a file by its URL,
    // and the brochure changes with the product's photos and price.
    : { url: `${site}/api/brochure/${Number(productId)}?v=${Date.now()}`, filename: fileName || 'doctor-fresh-brochure.pdf' };

  const [firstName] = splitName(name);
  try {
    const res = await fetch(`${API_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        campaignName: campaign,
        destination: to,
        userName: 'Doctor Fresh',
        templateParams: [firstName || 'Customer'],
        source: 'api',
        media,
        buttons: [],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: { FirstName: 'Customer' },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error(`[whatsapp] ${campaign} rejected (${res.status}):`, text.slice(0, 300));
      return { ok: false, status: res.status };
    }
    console.info(`[whatsapp] ${campaign} sent to ${to}`);
    return { ok: true };
  } catch (err) {
    console.error(`[whatsapp] ${campaign} failed:`, err.name === 'TimeoutError' ? 'timed out' : err.message);
    return { ok: false };
  }
}

/* ------------------------------------------------------- bulk campaigns */

/**
 * One campaign to many customers, from the admin (Customers → Send WhatsApp).
 * Numbers are cleaned to 91XXXXXXXXXX and de-duplicated; invalid ones are
 * dropped. The API takes up to 5000 messages a call, so larger lists go in
 * batches. `withName` sends each customer's first name as {{1}}; `mediaUrl`
 * is a public image for the template's header (instead of the campaign's own
 * saved media, which WhatsApp lets expire — error #131053).
 *
 * Returns { ok, sent (queued by limbu.ai), skipped, failed, invalid }. Queued is
 * not delivered: limbu.ai sends within a minute and reports delivery itself.
 */
export async function sendBulkCampaign({ campaign, customers, withName = false, mediaUrl = '' }) {
  // The header image as a public address, for every message. Given under both
  // names their API has used for a link, so either is picked up.
  const media = mediaUrl ? { url: mediaUrl, link: mediaUrl } : null;
  const seen = new Set();
  const messages = [];
  let skipped = 0;
  for (const c of customers || []) {
    const to = destination(c.mobile);
    if (!to || seen.has(to)) {
      skipped += 1;
      continue;
    }
    seen.add(to);
    const [firstName] = splitName(c.name);
    messages.push({
      destination: to,
      templateParams: withName ? [firstName || 'Customer'] : [],
      ...(media ? { media } : {}),
    });
  }

  let sent = 0;
  let failed = 0;
  let invalid = 0;
  for (let i = 0; i < messages.length; i += 5000) {
    const batch = messages.slice(i, i + 5000);
    const result = await sendCampaign(campaign, batch, media ? { media } : {});
    if (result.skipped) return { ok: false, sent, skipped, failed: messages.length, invalid, error: 'WHATSAPP_API_KEY is not set on the server.' };
    if (result.ok) {
      sent += result.queued;
      invalid += result.invalid;
    } else {
      failed += batch.length;
    }
  }
  return { ok: failed === 0 && sent > 0, sent, skipped, failed, invalid };
}

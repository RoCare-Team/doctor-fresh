// WhatsApp messages sent through the limbu.ai campaigns API.
//
//   WHATSAPP_API_KEY             the account's API key (required to send)
//   WHATSAPP_ORDER_CAMPAIGN      campaign for a placed order (default order_book)
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

// "Get a quotation" / "Download Brochure" on a product page → the `quotation`
// table, and the same details forwarded to the service centre's quotation
// endpoint (QUOTATION_FORWARD_URL) as { name, email, phone, productId }.
// The customer gets the brochure on WhatsApp (the brochure_download
// template). No WhatsApp goes to the team: their template is the order
// confirmation, and a brochure download is not an order.

import { isDbEnabled } from '@/lib/db';
import { after } from 'next/server';
import { createQuotation } from '@/lib/sql/engagement';
import { sendBrochureWhatsApp } from '@/lib/whatsapp';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

const FORWARD_URL = process.env.QUOTATION_FORWARD_URL
  || 'https://inet.waterpurifierservicecenter.in/doctorfresh_product_quotation.php';

/** Best-effort: a slow or failing endpoint never costs the customer their request. */
async function forwardQuotation(payload) {
  try {
    const res = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[quotation] forward answered ${res.status}:`, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error('[quotation] could not forward:', err?.message || err);
  }
}

export async function POST(request) {
  if (!isDbEnabled()) return fail('Please call +91-9311587716.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = normaliseName(body.name);
  if (!name) return fail('Enter your full name.');

  const phone = normaliseMobile(body.phone ?? body.mobile);
  if (!phone) return fail('Enter a valid 10-digit mobile number.');

  const email = normaliseEmail(body.email);
  if (email === null) return fail('Enter a valid email address.');

  if (!Number(body.productId)) return fail('Unknown product.');

  try {
    await createQuotation({ productId: body.productId, name, email: email || '', phone });
  } catch (err) {
    console.error('[quotation] could not save:', err.message);
    return fail('Could not send your request. Please call +91-9311587716.', 502);
  }

  after(() => forwardQuotation({ name, email: email || '', phone, productId: Number(body.productId) }));

  after(() => sendBrochureWhatsApp({ name, mobile: phone, productId: Number(body.productId) }));


  return Response.json({ ok: true });
}

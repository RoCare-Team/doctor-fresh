// "Get a quotation" on a product page → the `quotation` table.

import { isDbEnabled } from '@/lib/db';
import { createQuotation } from '@/lib/sql/engagement';
import { normaliseMobile, normaliseEmail, normaliseName } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

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

  return Response.json({ ok: true });
}

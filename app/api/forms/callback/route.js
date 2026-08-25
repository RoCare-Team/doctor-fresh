// "Request a callback" → `request_call_back`, as landing_page does.

import { isDbEnabled } from '@/lib/db';
import { createCallbackRequest } from '@/lib/sql/forms';
import { normaliseMobile, normaliseName } from '@/lib/auth/users';

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

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  try {
    await createCallbackRequest({ pageId: body.pageId, name, mobile, timing: body.timing });
  } catch (err) {
    console.error('[callback] could not save the request:', err.message);
    return fail('Could not send your request. Please call +91-9311587716.', 502);
  }

  return Response.json({ ok: true });
}

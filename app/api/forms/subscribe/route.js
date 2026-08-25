// Newsletter sign-up → the `subscribe` table, as /home/subscribe does.

import { isDbEnabled } from '@/lib/db';
import { subscribeToNewsletter } from '@/lib/sql/forms';
import { normaliseEmail } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Could not subscribe right now. Please try again later.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const email = normaliseEmail(body.email);
  if (!email) return fail('Enter a valid email address.');

  try {
    const added = await subscribeToNewsletter({ name: body.name ?? '', email });
    // Already on the list is not a failure worth showing as one.
    return Response.json({ ok: true, already: !added });
  } catch (err) {
    console.error('[subscribe] could not save:', err.message);
    return fail('Could not subscribe right now. Please try again.', 502);
  }
}

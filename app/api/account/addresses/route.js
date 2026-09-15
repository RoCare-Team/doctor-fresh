// The signed-in customer's saved delivery addresses, for checkout.

import { getSession } from '@/lib/auth/session';
import { getSavedAddresses } from '@/lib/sql/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: 'Please sign in.' }, { status: 401 });

  const saved = await getSavedAddresses(session.id);
  return Response.json(
    { ok: true, ...saved },
    // One customer's addresses: never a shared cache entry.
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

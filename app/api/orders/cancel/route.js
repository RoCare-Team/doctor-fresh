// Cancelling an order the customer placed.

import { getSession } from '@/lib/auth/session';
import { cancelOrder } from '@/lib/sql/engagement';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: 'Please sign in.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const result = await cancelOrder({ saleId: Number(body.saleId), userId: session.id });
  if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });

  return Response.json({ ok: true });
}

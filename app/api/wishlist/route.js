// Saving a product for later → `user.wishlist`.

import { getSession } from '@/lib/auth/session';
import { toggleWishlist } from '@/lib/sql/engagement';
import { getWishlistIds } from '@/lib/sql/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ ok: true, ids: [] });
  return Response.json({ ok: true, ids: await getWishlistIds(session.id) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: 'Please sign in to save products.', signIn: true }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const result = await toggleWishlist(session.id, body.productId);
  if (!result) return Response.json({ ok: false, error: 'Unknown product.' }, { status: 400 });

  return Response.json({ ok: true, ...result });
}

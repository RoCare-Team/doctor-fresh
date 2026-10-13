// GET /api/mobile/orders          — the signed-in customer's orders, newest
//                                    first, with their profile (what /profile
//                                    shows).
// GET /api/mobile/orders?id=<id>  — one of their orders (what /order/<id>
//                                    shows), or a guest order by its guest id
//                                    ("162-9f3a1c4b7e").
//
// Read-only. Uses the same `df_session` cookie as the rest of the site.

import { getSession } from '@/lib/auth/session';
import { getOrdersForUser, getProfile, getWishlistIds } from '@/lib/sql/account';
import { getOrder } from '@/lib/sql/orders';
import { fail, ok, PRIVATE_HEADERS } from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const ref = new URL(request.url).searchParams.get('id') || '';
  const session = await getSession();

  try {
    if (ref) {
      const guestId = /^\d+-[a-z0-9]+$/i.test(ref) ? ref : null;
      if (!guestId && !session) return fail('Please sign in.', 401);
      const order = await getOrder(guestId ? { guestId } : { saleId: Number(ref), userId: session.id });
      if (!order) return fail('Order not found.', 404);
      return ok({ order }, PRIVATE_HEADERS);
    }

    if (!session) return fail('Please sign in.', 401);
    const [orders, profile, wishlist] = await Promise.all([
      getOrdersForUser(session.id),
      getProfile(session.id).catch(() => null),
      getWishlistIds(session.id).catch(() => []),
    ]);
    return ok({ orders, profile, wishlistCount: (wishlist || []).length }, PRIVATE_HEADERS);
  } catch (err) {
    console.error('[mobile/orders]', err?.message || err);
    return fail('Could not load your orders.', 502);
  }
}

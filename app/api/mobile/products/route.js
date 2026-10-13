// GET /api/mobile/products?ids=1,2,3 — those products as cards, in the order
//                                       asked (wishlist, cart refresh).
// GET /api/mobile/products?q=<text>   — search, as /search does it.
// GET /api/mobile/products            — every product, as cards.
//
//   { ok, products: [card] }
//
// Read-only.

import { getAllProducts, getProductsByIds, searchProducts } from '@/lib/catalog';
import {
  mobileCard, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const ids = (params.get('ids') || '').split(',').map(Number).filter(Boolean).slice(0, 100);
  const q = (params.get('q') || '').trim().slice(0, 100);

  try {
    await readyMedia();
    let products;
    if (ids.length) products = await getProductsByIds(ids);
    else if (q) products = await searchProducts(q, 40);
    else products = await getAllProducts();

    return ok({ products: products.map(mobileCard) });
  } catch (err) {
    return unavailable(err, 'products');
  }
}

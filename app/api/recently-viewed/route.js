// Which products this visitor has just looked at.
//
// Held in a cookie rather than in the database: what someone browsed is theirs,
// and it must not need an account. The cookie holds ids only — the products
// themselves are read from the catalogue, so a price change shows up straight
// away and nothing stale is ever drawn from a browser.

import { cookies } from 'next/headers';
import { getProductsByIds } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const COOKIE = 'df_recent';
const LIMIT = 8;
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const readIds = (value) => String(value || '')
  .split(',')
  .map((id) => Number(id))
  .filter((id) => Number.isInteger(id) && id > 0)
  .slice(0, LIMIT);

export async function GET() {
  const ids = readIds((await cookies()).get(COOKIE)?.value);
  if (!ids.length) return Response.json({ ok: true, products: [] });

  const found = await getProductsByIds(ids);

  // getProductsByIds does not promise an order, and newest-first is the point.
  const byId = new Map(found.map((p) => [p.id, p]));
  const products = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      image: p.images?.[0] || null,
      price: p.price,
      mrp: p.mrp,
      category: p.category?.name || '',
    }));

  return Response.json({ ok: true, products });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 });

  const store = await cookies();
  const current = readIds(store.get(COOKIE)?.value);

  // Newest first; seeing a product again moves it back to the front.
  const next = [id, ...current.filter((x) => x !== id)].slice(0, LIMIT);

  store.set(COOKIE, next.join(','), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });

  return Response.json({ ok: true });
}

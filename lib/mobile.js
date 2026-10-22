// Shared helpers for the read-only endpoints under /api/mobile/*, which the
// Flutter app reads the catalogue from. The website itself does not use them:
// its pages read the same lib functions directly.
//
// Everything sent from here is absolute (images and links carry the site
// address), because an app has no page address to resolve a "/uploads/…"
// path against.

import { cardProduct } from '@/lib/catalog';
import { warmMedia } from '@/lib/blob';
import { absoluteUrl, imageUrl } from '@/lib/utils';

export const MOBILE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
};

export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const img = (src) => (src ? absoluteUrl(imageUrl(src)) : '');

/** Product images uploaded from the admin live in Vercel Blob. */
export async function readyMedia() {
  await warmMedia().catch(() => {});
}

/** A product as a card shows it, with its category name for the small lists. */
export function mobileCard(product) {
  const card = cardProduct(product);
  if (!card) return null;
  return {
    ...card,
    image: img(card.images[0]),
    images: card.images.map(img),
    category: product.category?.name || '',
    badges: product.badges || [],
  };
}

export const ok = (data, headers = MOBILE_HEADERS) => Response.json({ ok: true, ...data }, { headers });

export const fail = (error, status = 400) => Response.json(
  { ok: false, error },
  { status, headers: { 'Cache-Control': 'no-store' } },
);

/** The loaders throw when the database cannot answer. */
export function unavailable(err, where) {
  console.error(`[mobile/${where}]`, err?.message || err);
  return fail('This is unavailable right now. Please try again.', 503);
}




  
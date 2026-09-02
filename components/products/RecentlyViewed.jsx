'use client';

import { useEffect } from 'react';

/**
 * Records that this visitor opened this product.
 *
 * The id goes to the server, which keeps the short list in a cookie — the same
 * place the current site keeps it. Nothing is stored in the browser itself, so
 * private windows and cleared site data behave the same as anything else.
 */
export default function RecentlyViewed({ productId }) {
  useEffect(() => {
    if (!productId) return;

    fetch('/api/recently-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId }),
      // the visitor must never wait on this
      keepalive: true,
    }).catch(() => {});
  }, [productId]);

  return null;
}

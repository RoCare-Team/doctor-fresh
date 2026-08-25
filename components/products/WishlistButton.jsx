'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * Saves a product to the customer's wishlist (`user.wishlist`).
 *
 * The saved list is fetched once per mount rather than passed down, so a
 * product card stays a server component and pages stay prerendered.
 */
export default function WishlistButton({ productId, className, size = 18 }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSaved((d.ids || []).includes(Number(productId))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productId]);

  async function toggle(event) {
    // The button usually sits inside a link to the product.
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    setBusy(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.signIn) { router.push('/login'); return; }
      if (data.ok) setSaved(data.saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved products' : 'Save this product'}
      className={cx(
        'inline-flex items-center justify-center rounded-full transition-colors',
        saved ? 'text-danger' : 'text-ink-300 hover:text-danger',
        className,
      )}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}

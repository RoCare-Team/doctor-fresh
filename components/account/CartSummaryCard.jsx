'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/common/Button';
import { formatPrice } from '@/lib/utils';

/**
 * What is in the visitor's cart right now.
 *
 * The cart lives in the browser until an order is placed — the same as the
 * current site, where it is a session — so it is read on the client rather
 * than from the database.
 */
export default function CartSummaryCard() {
  const { items, ready, subtotal, count } = useCart();

  return (
    <div className="df-card p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
        <ShoppingCart size={17} className="text-primary-700" aria-hidden="true" />
        Your cart
      </h2>

      {!ready ? (
        <div className="mt-4 h-24 animate-pulse rounded-md bg-surface-muted" />
      ) : items.length ? (
        <>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-line">
                  <SafeImage src={i.image} fill sizes="48px" className="object-contain p-1" iconSize={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={i.url} className="line-clamp-2 text-[13.5px] leading-snug text-ink-700 hover:text-primary-800">
                    {i.name}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-ink-400">
                    Qty {i.qty} · {formatPrice(i.price * i.qty)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-line pt-3 text-[15px] font-semibold text-ink-900">
            <span>{count} item{count === 1 ? '' : 's'}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="mt-4 grid gap-2">
            <Button href="/cart-checkout" full>Checkout</Button>
            <Button href="/cart" variant="outline" full>View cart</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-[14px] text-ink-400">Your cart is empty.</p>
          <Button href="/all-category" variant="outline" full className="mt-4">Browse products</Button>
        </>
      )}
    </div>
  );
}

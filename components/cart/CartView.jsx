'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';
import Button from '@/components/common/Button';
import { formatPrice, imageUrl } from '@/lib/utils';

export default function CartView() {
  const { items, ready, subtotal, mrpTotal, savings, setQty, remove } = useCart();

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-[14px] bg-surface-muted" />;
  }

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
        <ShoppingBag size={34} className="mx-auto text-ink-300" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-ink-900">Your cart is empty</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-400">
          Browse water purifiers, softeners and spare parts to get started.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="/category/water-purifier">Shop water purifiers</Button>
          <Button href="/all-category" variant="outline">All categories</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="flex gap-4 df-card p-4">
            <Link href={item.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-line sm:h-24 sm:w-24">
              <Image
                src={imageUrl(item.image)}
                alt=""
                fill
                sizes="96px"
                className="object-contain p-1.5"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="text-[15px] font-medium leading-snug text-ink-900">
                <Link href={item.url} className="transition-colors hover:text-primary-800">
                  {item.name}
                </Link>
              </h2>

              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[14px]">
                <span className="font-semibold text-ink-900">{formatPrice(item.price)}</span>
                {item.mrp > item.price ? (
                  <span className="text-ink-300 line-through">{formatPrice(item.mrp)}</span>
                ) : null}
                {item.unit ? <span className="text-ink-400">{item.unit}</span> : null}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="inline-flex h-9 items-center rounded-md border border-line-strong">
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty - 1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="flex h-full w-9 items-center justify-center text-ink-500 transition-colors hover:text-primary-800"
                  >
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <span className="w-9 border-x border-line-strong text-center text-[14px] leading-9">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty + 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                    className="flex h-full w-9 items-center justify-center text-ink-500 transition-colors hover:text-primary-800"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[15px] font-semibold text-ink-900">
                    {formatPrice(item.price * item.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-400 transition-colors hover:text-danger"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        <div className="pt-2">
          <Button href="/all-category" variant="outline">
            Continue shopping
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-[138px] lg:self-start">
        <div className="df-card p-5">
          <h2 className="text-[16px] font-semibold text-ink-900">Order summary</h2>

          <dl className="mt-4 space-y-2.5 text-[14.5px]">
            <div className="flex justify-between">
              <dt className="text-ink-400">Item total (MRP)</dt>
              <dd className="text-ink-700">{formatPrice(mrpTotal)}</dd>
            </div>
            {savings > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-400">Discount</dt>
                <dd className="text-success">− {formatPrice(savings)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-400">Shipping</dt>
              <dd className="text-success">Free</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-[16px] font-semibold text-ink-900">
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
          </dl>

          <Button href="/cart-checkout" size="lg" full className="mt-5">
            Proceed to checkout
          </Button>

          <p className="mt-3 text-center text-[13px] text-ink-400">
            Free installation included on water purifiers
          </p>
        </div>
      </aside>
    </div>
  );
}

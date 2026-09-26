'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Minus, Plus, Trash2, ShieldCheck, ShoppingCart, ArrowRight,
} from 'lucide-react';
import Image from 'next/image';
import { Wrench } from 'lucide-react';
import { useServiceCart } from '@/lib/service-cart';
import { formatPrice } from '@/lib/utils';

/** The services picked so far, before the booking itself. */
export default function ServiceCart() {
  const router = useRouter();
  const [lines, cart] = useServiceCart();
  const [who, setWho] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setWho(d.user || null))
      .catch(() => setWho(null));
  }, []);

  if (!cart.ready) return null;

  if (!lines.length) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink-300">
          <ShoppingCart size={24} aria-hidden="true" />
        </span>
        <p className="mt-3 text-[16px] font-semibold text-ink-900">Your cart is empty</p>
        <p className="mt-1 text-[14px] text-ink-400">Add a service to book a visit.</p>
        <Link
          href="/water-purifier-service"
          className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary-600 px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-primary-700"
        >
          Browse services
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {who ? (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[13px] text-primary-800">
          <ShieldCheck size={14} aria-hidden="true" />
          {`Signed in as ${who.name || `+91 ${who.mobile}`}`}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <p className="border-b border-line bg-surface-muted px-5 py-3 text-[14px] font-semibold text-ink-900">
          {`Services (${lines.length})`}
        </p>

        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-5 py-4">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                {l.image
                    ? <Image src={l.image} alt="" fill sizes="64px" className="object-cover" unoptimized />
                    : <span className="flex h-full w-full items-center justify-center"><Wrench size={16} className="text-ink-300" aria-hidden="true" /></span>}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink-900">{l.name}</span>
                <span className="block text-[14px] font-semibold text-primary-800">{formatPrice(l.price)}</span>

                <span className="mt-2 inline-flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg border border-line-strong">
                    <button
                      type="button"
                      onClick={() => cart.setQty(l, l.qty - 1)}
                      aria-label="One fewer"
                      className="px-2.5 py-1.5 text-ink-500 transition-colors hover:text-primary-700"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span className="min-w-8 text-center text-[14px] font-medium text-ink-900">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => cart.setQty(l, l.qty + 1)}
                      aria-label="One more"
                      className="px-2.5 py-1.5 text-ink-500 transition-colors hover:text-primary-700"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => cart.remove(l.id)}
                    aria-label={`Remove ${l.name}`}
                    className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-danger/5 hover:text-danger"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </span>
              </span>

              <span className="shrink-0 text-[15px] font-semibold text-ink-900">
                {formatPrice(l.price * l.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <span className="text-[15px] text-ink-700">Total</span>
          <span className="text-[19px] font-semibold text-primary-800">{formatPrice(cart.total)}</span>
        </div>

        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={() => router.push('/book/checkout')}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <ShieldCheck size={17} aria-hidden="true" />
            Book Service
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="mt-2 text-center text-[12.5px] text-ink-400">
            Nothing is charged now — you pay the technician after the visit.
          </p>
        </div>
      </div>
    </>
  );
}

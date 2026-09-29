'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BadgeCheck, CalendarClock, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Wallet, Wrench,
} from 'lucide-react';
import { useServiceCart } from '@/lib/service-cart';
import { formatPrice } from '@/lib/utils';

/**
 * The services picked so far, before the booking itself.
 *
 * Laid out the way a checkout is: what is being bought on the left, what it
 * costs and the way on from here in a panel that stays in view on the right.
 * The panel repeats the total because that is the number someone is deciding
 * on, and it should never be scrolled off the screen.
 */

/** What a visitor wants to know before pressing the button. */
const ASSURANCES = [
  { icon: Wallet, text: 'Nothing is charged now — pay the technician after the visit' },
  { icon: CalendarClock, text: 'We call to confirm the time before anyone sets off' },
  { icon: BadgeCheck, text: 'Trained technicians, genuine parts' },
];

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

  if (!cart.ready) {
    // The basket is read in the browser, so the first paint has nothing to
    // show. A box the size of the real one keeps the page from jumping.
    return <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" />;
  }

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
    <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6">
      {/* ------------------------------------------------------ what is booked */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">
            {`${lines.length} ${lines.length === 1 ? 'service' : 'services'}`}
          </h2>
          {who ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[12.5px] text-primary-800">
              <ShieldCheck size={13} aria-hidden="true" />
              {who.name || `+91 ${who.mobile}`}
            </span>
          ) : null}
        </header>

        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-4 p-4 sm:p-5">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-muted sm:h-20 sm:w-20">
                {l.image
                  ? <Image src={l.image} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Wrench size={18} className="text-ink-300" aria-hidden="true" />
                    </span>
                  )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug text-ink-900">{l.name}</p>
                  {l.group ? <p className="mt-0.5 text-[12.5px] text-ink-400">{l.group}</p> : null}
                  <p className="mt-1 text-[13.5px] text-ink-500">{`${formatPrice(l.price)} each`}</p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                  <span className="text-[16px] font-semibold text-ink-900">{formatPrice(l.price * l.qty)}</span>

                  <span className="inline-flex items-center gap-1">
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
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-5 py-3.5">
          <Link
            href="/water-purifier-service"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            Add another service
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* --------------------------------------------------- the decision panel */}
      <aside className="rounded-2xl border border-line bg-white lg:sticky lg:top-6">
        <h2 className="border-b border-line px-5 py-3.5 text-[14.5px] font-semibold text-ink-900">
          Summary
        </h2>

        <dl className="space-y-2 px-5 py-4 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-ink-500">{`Services (${cart.count})`}</dt>
            <dd className="text-ink-900">{formatPrice(cart.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Visit charge</dt>
            <dd className="font-medium text-success">Free</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-[16px]">
            <dt className="font-medium text-ink-900">Total</dt>
            <dd className="font-semibold text-primary-800">{formatPrice(cart.total)}</dd>
          </div>
        </dl>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => router.push('/book/checkout')}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.99]"
          >
            Book Service
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <ul className="mt-4 space-y-2.5">
            {ASSURANCES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-2 text-[12.5px] leading-snug text-ink-500">
                <Icon size={14} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

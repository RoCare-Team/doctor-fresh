'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Wrench, Phone, Inbox, Mail, MessageCircle, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { cx, formatPrice } from '@/lib/utils';

/**
 * The work waiting on somebody, as one list to work down.
 *
 * The tiles above say how many; this says who — the name, what they asked for,
 * how long they have waited, and the number to ring.
 *
 * One kind at a time, behind tabs with their counts. Printed one under the
 * other the five lists ran far past the fold, and a dashboard that has to be
 * scrolled is no longer a dashboard: the point is that the whole of it is in
 * front of you the moment the admin opens.
 */

const LOOK = {
  order: { icon: ShoppingBag, chip: 'bg-primary-50 text-primary-700' },
  booking: { icon: Wrench, chip: 'bg-violet-50 text-violet-700' },
  callback: { icon: Phone, chip: 'bg-amber-50 text-amber-700' },
  enquiry: { icon: Inbox, chip: 'bg-emerald-50 text-emerald-700' },
  message: { icon: Mail, chip: 'bg-sky-50 text-sky-700' },
};

/** "2h ago" — how long someone has waited reads faster than a date. */
function waited(at) {
  const t = typeof at === 'number' ? at : Date.parse(at);
  if (!t || Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

const waLink = (mobile) => `https://wa.me/91${String(mobile).replace(/\D/g, '').slice(-10)}`;

export default function WorkQueue({ queue }) {
  const groups = (queue?.groups || []).filter((g) => g.items.length);
  const [open, setOpen] = useState(groups[0]?.id || null);
  const shown = groups.find((g) => g.id === open) || groups[0];

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_1px_3px_rgb(16_24_40/0.08),0_10px_24px_-6px_rgb(16_24_40/0.18)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink-900">
          Today&rsquo;s work
          {queue?.total ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-amber-700">
              {queue.total}
            </span>
          ) : null}
        </h2>
        <p className="text-[12.5px] text-ink-400">Call, then mark it done in its own section</p>
      </div>

      {!groups.length ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-line px-3 py-5 text-[14px] font-medium text-emerald-600">
          <CheckCircle2 size={17} aria-hidden="true" />
          Nothing is waiting — every order, visit and enquiry has been handled.
        </p>
      ) : (
        <>
          {/* One row of tabs: what kind of work, and how much of it. */}
          <div className="df-no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {groups.map((g) => {
              const { icon: Icon, chip } = LOOK[g.id] || LOOK.message;
              const active = g.id === shown?.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setOpen(g.id)}
                  className={cx(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
                    active
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-line bg-white text-ink-600 hover:border-primary-300',
                  )}
                >
                  <span className={cx('flex h-5 w-5 items-center justify-center rounded', active ? 'bg-white/20 text-white' : chip)}>
                    <Icon size={12} aria-hidden="true" />
                  </span>
                  {g.label}
                  <span className={cx('tabular-nums', active ? 'text-white/80' : 'text-ink-400')}>{g.items.length}</span>
                </button>
              );
            })}
          </div>

          <ul className="mt-2.5 space-y-1.5">
            {(shown?.items || []).map((row) => (
              <li
                key={`${shown.id}-${row.id}`}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 transition-colors hover:border-primary-200"
              >
                <Link href={row.href} className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink-900">
                    {row.title}
                    <span className="ml-2 text-[12px] font-normal text-ink-300">{waited(row.at)}</span>
                  </span>
                  <span className="block truncate text-[12px] text-ink-400">
                    {row.detail}
                    {row.amount ? ` · ${formatPrice(row.amount)}` : ''}
                  </span>
                </Link>

                {/* The whole point of the row: reaching the person on it. */}
                {row.mobile ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <a
                      href={`tel:${row.mobile}`}
                      aria-label={`Call ${row.title}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[12px] font-medium text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                    >
                      <Phone size={12} aria-hidden="true" />
                      {row.mobile}
                    </a>
                    <a
                      href={waLink(row.mobile)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp ${row.title}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white transition-opacity hover:opacity-90"
                    >
                      <MessageCircle size={13} aria-hidden="true" />
                    </a>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {/* The list is only the first few; this opens the section itself,
              whichever tab is showing. */}
          <Link
            href={shown.href}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[13px] font-semibold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
          >
            {`See all ${shown.label.toLowerCase()}`}
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  );
}

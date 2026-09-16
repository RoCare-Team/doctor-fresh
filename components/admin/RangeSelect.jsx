'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, Loader2 } from 'lucide-react';

/**
 * The window the dashboard is read over. It is a real navigation rather than
 * client state, so the chosen window survives a refresh and can be shared as a
 * link — `/admin?range=30d`.
 *
 * The figures are counted on the server, which on a big order book takes a
 * moment; the transition keeps the old numbers on screen and says it is
 * working rather than blanking the page.
 */
export default function RangeSelect({
  ranges, value, basePath = '/admin', keep = {},
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Whatever else the page is filtered by — a status, a search — travels with
  // the new window instead of being dropped.
  function hrefFor(range) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) {
      if (v) query.set(k, String(v));
    }
    query.set('range', range);
    return `${basePath}?${query.toString()}`;
  }

  return (
    <label
      aria-busy={pending}
      className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 transition-colors ${
        pending ? 'border-primary-500 text-primary-700' : 'border-line-strong'
      }`}
    >
      {pending
        ? <Loader2 size={15} className="shrink-0 animate-spin text-primary-600" aria-hidden="true" />
        : <CalendarRange size={15} className="shrink-0 text-ink-400" aria-hidden="true" />}

      <span className="sr-only">Show</span>
      <select
        value={value}
        disabled={pending}
        // Always spelled out in the URL, so the window does not depend on
        // which entry happens to be listed first.
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => router.push(hrefFor(next)));
        }}
        className="cursor-pointer bg-transparent pr-1 text-[13.5px] font-medium text-ink-800 outline-none disabled:cursor-wait disabled:text-primary-700"
      >
        {ranges.map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>

      <span aria-live="polite" className="sr-only">{pending ? 'Loading orders' : ''}</span>
    </label>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * "Trace my order" — the sale-code box the current site puts beside the order
 * history.
 *
 * The customer's own orders are already on the page, so the code is matched
 * against those rather than asked of the server: a code that is not theirs
 * would not open anyway, and this way a typo answers immediately.
 */
export default function OrderTrace({ orders = [] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const wanted = code.trim().toLowerCase();
    if (!wanted) return;

    const found = orders.find((o) => String(o.code || '').toLowerCase() === wanted
      || String(o.id) === wanted);

    if (!found) {
      setError('No order of yours has that code.');
      return;
    }
    router.push(`/order/${found.id}`);
  }

  return (
    <form onSubmit={submit} className="df-card p-4">
      <h3 className="text-[15px] font-semibold text-ink-900">Trace my order</h3>
      <p className="mt-1 text-[13.5px] text-ink-400">Enter the sale code from your order.</p>

      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="Sale code"
          aria-label="Sale code"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
        />
        <button
          type="submit"
          aria-label="Trace my order"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-900"
        >
          <Search size={15} aria-hidden="true" />
          Trace
        </button>
      </div>

      {error ? <p className="mt-2 text-[13.5px] text-danger">{error}</p> : null}
    </form>
  );
}

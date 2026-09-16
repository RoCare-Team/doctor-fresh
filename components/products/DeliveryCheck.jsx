'use client';

import { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

const STORE_KEY = 'df_pincode';

/**
 * The "where does this ship to" line every shop puts under the price. It
 * answers with the real post office data behind /api/pincode rather than
 * promising a date the business has not committed to, and remembers the pin
 * so the shopper types it once per device.
 */
export default function DeliveryCheck() {
  const [pin, setPin] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (/^\d{6}$/.test(saved || '')) {
        setPin(saved);
        check(saved);
      }
    } catch { /* private mode — the shopper can still type a pin */ }
  }, []);

  async function check(value) {
    if (!/^[1-9]\d{5}$/.test(value)) {
      setState({ status: 'error', message: 'Enter a 6-digit pin code' });
      return;
    }

    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/pincode/${value}`);
      const data = await res.json();
      if (!data?.ok) {
        setState({ status: 'error', message: 'We could not find this pin code' });
        return;
      }
      try { localStorage.setItem(STORE_KEY, value); } catch { /* ignore */ }
      setState({ status: 'done', city: data.city, state: data.state });
    } catch {
      setState({ status: 'error', message: 'Could not check right now — please try again' });
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink-700">
        <MapPin size={15} className="text-primary-700" aria-hidden="true" />
        Check delivery &amp; installation
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); check(pin); }}
        className="mt-2.5 flex gap-2"
      >
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            setState({ status: 'idle' });
          }}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          aria-label="Pin code"
          placeholder="Enter pin code"
          className="h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none placeholder:text-ink-300 focus:border-primary-500"
        />
        <button
          type="submit"
          disabled={state.status === 'loading'}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-primary-500 px-4 text-[14px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-60"
        >
          {state.status === 'loading' ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : null}
          Check
        </button>
      </form>

      <p aria-live="polite" className="mt-2 text-[13px]">
        {state.status === 'done' ? (
          <span className="text-ink-500">
            <span className="font-medium text-success">Delivers to {state.city}, {state.state}</span>
            {' — free shipping and free installation by a certified technician.'}
          </span>
        ) : null}
        {state.status === 'error' ? <span className="text-danger">{state.message}</span> : null}
      </p>
    </div>
  );
}

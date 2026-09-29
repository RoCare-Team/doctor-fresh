'use client';

// The two ways out of an unpaid booking: pay that same page again, or let the
// technician take the money after the visit.
//
// Both matter because the payment page belongs to the service's own gateway:
// if the customer cancels there, they land on the service's page, not ours,
// and coming back to a booking that says "pay now or nothing" would be a dead
// end. Nothing here can lose the visit — it is already booked.

import { useState } from 'react';
import { Loader2, ShieldCheck, Wallet } from 'lucide-react';

export default function PayLater({ refCode, paymentUrl }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-[13.5px] text-ink-700">
        Noted — the technician will take the payment after the visit.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {paymentUrl ? (
        <a
          href={paymentUrl}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Pay now
        </a>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch('/api/services/pay-later', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: refCode }),
          }).catch(() => null);
          setBusy(false);
          if (res?.ok) setDone(true);
        }}
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong px-5 text-[14.5px] font-medium text-ink-800 transition-colors hover:border-primary-400 disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />}
        Pay after the visit instead
      </button>
    </div>
  );
}

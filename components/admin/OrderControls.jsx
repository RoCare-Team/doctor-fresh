'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { cx } from '@/lib/utils';

const LABEL = {
  pending: 'Pending',
  shipped: 'Shipped',
  delivered: 'Delivered',
  'order cancelled': 'Cancelled',
};

/** Changing an order's delivery and payment state. */
export default function OrderControls({ saleId, delivery, paid, statuses }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function update(patch) {
    setBusy(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save the change.');

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-ink-900">Update order</h2>

      <p className="mt-4 text-[13px] font-medium text-ink-400">Delivery status</p>
      <div className="mt-2 grid gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy || s === delivery}
            onClick={() => update({ delivery: s })}
            className={cx(
              'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[14px] transition-colors',
              s === delivery
                ? 'border-primary-500 bg-primary-50 font-medium text-primary-800'
                : 'border-line-strong text-ink-700 hover:border-primary-300 disabled:opacity-50',
            )}
          >
            {LABEL[s] || s}
            {s === delivery ? <Check size={15} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[13px] font-medium text-ink-400">Payment</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => update({ paid: !paid })}
        className={cx(
          'mt-2 w-full rounded-lg border px-3.5 py-2.5 text-[14px] transition-colors',
          paid
            ? 'border-success bg-success/10 font-medium text-success'
            : 'border-line-strong text-ink-700 hover:border-primary-300',
        )}
      >
        {paid ? 'Paid — mark as due' : 'Mark as paid'}
      </button>

      {error ? <p className="mt-3 text-[13.5px] text-danger">{error}</p> : null}
      {saved && !error ? <p className="mt-3 text-[13.5px] text-success">Saved</p> : null}
    </div>
  );
}

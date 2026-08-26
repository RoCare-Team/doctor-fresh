'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Circle } from 'lucide-react';
import { cx } from '@/lib/utils';

/** Marks an enquiry dealt with, or puts it back on the open list. */
export default function HandledToggle({ kind, id, handled }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/admin/enquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, handled: !handled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors disabled:opacity-50',
          handled
            ? 'border-success bg-success/10 text-success'
            : 'border-line-strong text-ink-500 hover:border-primary-300 hover:text-primary-800',
        )}
      >
        {handled ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
        {handled ? 'Done' : 'Mark done'}
      </button>
      {error ? <span className="text-[12px] text-danger">{error}</span> : null}
    </span>
  );
}

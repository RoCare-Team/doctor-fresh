'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function CouponDelete({ id, code }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    // Deleting a coupon cannot be undone, so it is confirmed first.
    if (!window.confirm(`Delete coupon ${code}?`)) return;

    setBusy(true);
    await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Delete coupon ${code}`}
      className="p-1.5 text-ink-300 transition-colors hover:text-danger disabled:opacity-50"
    >
      <Trash2 size={15} aria-hidden="true" />
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Can } from '@/components/admin/AdminAccess';

/** Deletes one message after a second click — for spam, not for handled mail. */
function DeleteMessageButtonInner({ id }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setBusy(true);
    const res = await fetch(`/api/admin/enquiries?id=${id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Delete message"
      className={armed
        ? 'inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger px-2.5 text-[12.5px] font-semibold text-white'
        : 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-400 transition-colors hover:bg-danger/10 hover:text-danger'}
    >
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
      {armed ? 'Click again to delete' : 'Delete'}
    </button>
  );
}

/** Shown only to admins whose role allows this; the server checks again on save. */
export default function DeleteMessageButton(props) {
  return (
    <Can section={'messages'} action={'delete'}>
      <DeleteMessageButtonInner {...props} />
    </Can>
  );
}

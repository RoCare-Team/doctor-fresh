'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { refreshSession } from '@/lib/useSession';

/**
 * Signing out lives in the account area rather than a header dropdown: the
 * header control now opens the profile in one click, which is where a customer
 * looks for it.
 */
export default function SignOutButton({ variant = 'row' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    // Re-reading the session is also what empties the cart: the cart provider
    // listens for it and drops a basket whose account is no longer signed in.
    await refreshSession();
    router.push('/');
    router.refresh();
  }

  // "row" fills the sidebar's last slot; "compact" sits in the corner of the
  // card that replaces the sidebar on a phone.
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
      >
        <LogOut size={14} aria-hidden="true" />
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-colors hover:border-danger/20 hover:bg-danger/5 disabled:opacity-60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <LogOut size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-tight text-danger">
          {busy ? 'Signing out…' : 'Sign out'}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-ink-400">Log out of this device</span>
      </span>
    </button>
  );
}

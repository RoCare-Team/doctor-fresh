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
    await refreshSession();
    router.push('/');
    router.refresh();
  }

  // "row" fills the sidebar's last slot; "compact" sits in the corner of the
  // card that replaces the sidebar on a phone.
  const className = variant === 'compact'
    ? 'flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:border-line-strong hover:text-ink-700 disabled:text-ink-300'
    : 'flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14.5px] text-ink-700 transition-colors hover:bg-surface-muted disabled:text-ink-300';

  return (
    <button type="button" onClick={signOut} disabled={busy} className={className}>
      <LogOut size={variant === 'compact' ? 14 : 16} aria-hidden="true" className="text-ink-300" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

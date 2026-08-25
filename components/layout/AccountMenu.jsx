'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, LogIn, UserPlus, Package } from 'lucide-react';

/**
 * The account control in the header. Signed out it offers signing in and
 * creating an account; signed in it shows the visitor's first name and a
 * sign-out button.
 *
 * The session is fetched from the browser rather than passed down from the
 * layout: reading the cookie on the server would make every page render per
 * request instead of being served from the prerendered build.
 */
export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setUser(d.user); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onDocument(event) {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    }
    function onEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocument);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocument);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  if (!user) {
    return (
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex flex-col items-center rounded-lg px-3 py-1.5 text-ink-700 transition-colors hover:bg-surface-muted"
        >
          <User size={20} aria-hidden="true" />
          <span className="mt-0.5 hidden text-[12.5px] text-ink-400 lg:block">Account</span>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-60 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          >
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] text-ink-700 transition-colors hover:bg-surface-muted"
            >
              <LogIn size={15} aria-hidden="true" />
              Sign in
            </Link>

            <Link
              href="/registration"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] text-ink-700 transition-colors hover:bg-surface-muted"
            >
              <UserPlus size={15} aria-hidden="true" />
              Create an account
            </Link>

            <p className="border-t border-line px-3 pb-1 pt-2.5 text-[12.5px] leading-snug text-ink-400">
              Sign in to track your orders and service requests.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  const firstName = (user.name || '').split(' ')[0] || user.mobile;

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex flex-col items-center rounded-lg px-3 py-1.5 text-ink-700 transition-colors hover:bg-surface-muted"
      >
        <User size={20} aria-hidden="true" />
        <span className="mt-0.5 hidden max-w-22.5 truncate text-[12.5px] text-ink-400 lg:block">
          {firstName}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-60 rounded-xl border border-line bg-white p-1.5 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[14px] font-medium text-ink-900">{user.name || 'Your account'}</p>
            <p className="mt-0.5 text-[13px] text-ink-400">+91 {user.mobile}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] text-ink-700 transition-colors hover:bg-surface-muted"
          >
            <Package size={15} aria-hidden="true" />
            My orders &amp; profile
          </Link>

          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] text-ink-700 transition-colors hover:bg-surface-muted disabled:text-ink-300"
          >
            <LogOut size={15} aria-hidden="true" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

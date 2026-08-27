'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, LogIn, UserPlus, ShieldCheck } from 'lucide-react';

/**
 * Asks a signed-out visitor to sign in before checking out.
 *
 * An order has to belong to an account — that is what makes it traceable, what
 * puts it in "My orders", and what lets support find it later. Rather than
 * dropping the visitor on the sign-in page and losing what they were doing,
 * this asks in place and carries them back with `next`.
 */
export default function SignInPrompt({
  open,
  onClose,
  next = '/cart-checkout',
  title = 'Sign in to place your order',
  message = 'Your basket is saved. Sign in or create an account and you will come straight back here.',
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const query = `?next=${encodeURIComponent(next)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-prompt-title"
        className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>

        <h2 id="signin-prompt-title" className="mt-4 text-[19px] font-semibold text-ink-900">
          {title}
        </h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{message}</p>

        <div className="mt-6 space-y-2.5">
          <Link
            href={`/registration${query}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-500 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900"
          >
            <UserPlus size={17} aria-hidden="true" />
            Create an account
          </Link>
          <Link
            href={`/login${query}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line-strong text-[15px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
          >
            <LogIn size={17} aria-hidden="true" />
            I already have an account
          </Link>
        </div>

        <p className="mt-4 text-center text-[13px] text-ink-400">
          Signing in takes one OTP on your mobile number.
        </p>
      </div>
    </div>
  );
}

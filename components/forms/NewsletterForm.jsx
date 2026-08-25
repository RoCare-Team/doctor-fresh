'use client';

import { useFormSubmit } from '@/lib/forms';

export default function NewsletterForm() {
  const { status, send, sending } = useFormSubmit('/api/forms/subscribe');

  return (
    <form onSubmit={send} className="flex w-full max-w-md items-center gap-2.5">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        name="email"
        required
        placeholder="Enter your email address"
        className="h-12 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-primary-400 focus:bg-white/10"
      />
      <button
        type="submit"
        disabled={sending}
        className="h-12 shrink-0 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-60"
      >
        {status === 'done' ? 'Subscribed' : sending ? 'Sending…' : 'Subscribe'}
      </button>
    </form>
  );
}

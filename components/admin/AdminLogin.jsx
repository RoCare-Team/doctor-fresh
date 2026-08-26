'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Input, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * Admin sign-in with the email and password already stored on the `admin`
 * row — the same credentials the current panel uses.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not sign in.');

      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink-900">Sign in</h1>
      <p className="mt-1.5 text-[14px] text-ink-400">
        Use the same email and password as the existing admin panel.
      </p>

      <form onSubmit={signIn} className="mt-5 grid gap-3.5">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="you@doctorfresh.in"
          autoComplete="username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <Button type="submit" size="lg" full disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>

        {error ? <FormNote status="error" error={error} /> : null}
      </form>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12.5px] text-ink-400">
        <ShieldCheck size={13} aria-hidden="true" />
        Admin access only
      </p>
    </div>
  );
}

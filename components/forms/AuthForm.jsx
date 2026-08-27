'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Input, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { refreshSession } from '@/lib/useSession';

/**
 * Where to go once signed in.
 *
 * `?next=` is read off the URL rather than through `useSearchParams`, which
 * would force these otherwise static pages to render per request. Only a path
 * on this site is accepted — an absolute URL here would be an open redirect.
 */
function returnTo() {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  return next && /^\/(?!\/)/.test(next) ? next : '/';
}

/**
 * Sign-in and registration, both on the site's existing mobile + OTP flow.
 *
 * Two steps: collect details and ask for a code, then verify it. Registration
 * additionally takes a name and email, which are validated before the code is
 * sent so nobody reads an SMS only to be told their email was wrong.
 */
export default function AuthForm({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const router = useRouter();

  const [step, setStep] = useState('details'); // details | code
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [details, setDetails] = useState({ name: '', email: '', mobile: '' });
  const codeRef = useRef(null);

  // Set after mount, not during render: the server has no URL to read and the
  // two would disagree at hydration.
  const [carry, setCarry] = useState('');
  useEffect(() => {
    const next = returnTo();
    setCarry(next === '/' ? '' : `?next=${encodeURIComponent(next)}`);
  }, []);

  // Resend countdown — the API allows one code per minute per number.
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  async function post(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  async function requestCode(values) {
    setBusy(true);
    setError('');
    try {
      const data = await post('/api/auth/request-otp', { ...values, mode });
      setDetails({ ...values, mobile: data.mobile });
      setSeconds(60);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function onDetailsSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    requestCode({
      name: form.get('name') || '',
      email: form.get('email') || '',
      mobile: form.get('mobile') || '',
    });
  }

  async function onCodeSubmit(event) {
    event.preventDefault();
    const otp = new FormData(event.currentTarget).get('otp');

    setBusy(true);
    setError('');
    try {
      await post('/api/auth/verify-otp', { ...details, otp, mode });
      // Server components read the session cookie, so the tree is refreshed
      // rather than the state being duplicated on the client.
      refreshSession();
      router.replace(returnTo());
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="df-card mx-auto w-full max-w-md p-6 md:p-7">
      {step === 'details' ? (
        <>
          <h1 className="text-xl font-semibold text-ink-900">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-400">
            {isRegister
              ? 'Track orders, service requests and AMC plans in one place.'
              : 'We will send a one-time code to your mobile number.'}
          </p>

          <form onSubmit={onDetailsSubmit} className="mt-6 grid gap-3.5">
            {isRegister ? (
              <>
                <Input label="Full name" name="name" required maxLength={100} placeholder="Your name" autoComplete="name" />
                <Input label="Email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              </>
            ) : null}

            <Input
              label="Mobile number"
              name="mobile"
              type="tel"
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="10 digit mobile number"
              autoComplete="tel"
            />

            <Button type="submit" size="lg" full disabled={busy} className="mt-1">
              {busy ? 'Sending code…' : 'Send OTP'}
            </Button>

            {error ? <FormNote status="error" error={error} /> : null}
          </form>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { setStep('details'); setError(''); }}
            className="mb-4 inline-flex items-center gap-1.5 text-[14px] text-ink-400 transition-colors hover:text-primary-700"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Change number
          </button>

          <h1 className="text-xl font-semibold text-ink-900">Enter the code</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-400">
            We sent a code to <span className="font-medium text-ink-700">+91 {details.mobile}</span>.
          </p>

          <form onSubmit={onCodeSubmit} className="mt-6 grid gap-3.5">
            <Input
              ref={codeRef}
              label="One-time code"
              name="otp"
              required
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter OTP"
              autoComplete="one-time-code"
              className="[&_input]:tracking-[0.4em]"
            />

            <Button type="submit" size="lg" full disabled={busy} className="mt-1">
              {busy ? 'Verifying…' : isRegister ? 'Create account' : 'Sign in'}
            </Button>

            {error ? <FormNote status="error" error={error} /> : null}


            <button
              type="button"
              disabled={seconds > 0 || busy}
              onClick={() => requestCode(details)}
              className="text-[14px] text-primary-700 transition-colors hover:text-primary-800 disabled:text-ink-300"
            >
              {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-center text-[14px] text-ink-400">
        {isRegister ? 'Already have an account? ' : 'New to Doctor Fresh? '}
        <Link
          href={(isRegister ? '/login' : '/registration') + carry}
          className="font-medium text-primary-700 hover:text-primary-800"
        >
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  );
}

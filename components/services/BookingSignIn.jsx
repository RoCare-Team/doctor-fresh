'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, ShieldCheck, RotateCw, X, Loader2 } from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * Signing in to book a service: a number, a sum to prove there is a person
 * there, and the code that follows.
 *
 * No name, no password, no account to create first — someone whose purifier
 * has stopped is not going to fill a registration form. The name and address
 * are asked for on the booking itself, where they are actually needed.
 */
const sum = () => {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  return { a, b, answer: a + b };
};

export default function BookingSignIn({ open, onClose, onSignedIn }) {
  const [step, setStep] = useState('number'); // number | code
  const [mobile, setMobile] = useState('');
  const [maths, setMaths] = useState(sum);
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const firstField = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setStep('number');
    setCode('');
    setAnswer('');
    setError('');
    setMaths(sum());
    const id = window.setTimeout(() => firstField.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  // The "resend" countdown after a code has gone out.
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = window.setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const digits = mobile.replace(/\D/g, '').slice(0, 10);

  async function sendCode(again = false) {
    if (digits.length !== 10) { setError('Enter your 10-digit mobile number.'); return; }
    if (!again && Number(answer) !== maths.answer) {
      setError('That sum is not right.');
      setMaths(sum());
      setAnswer('');
      return;
    }

    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'book', mobile: digits }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);

    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not send the code. Try again.'); return; }
    setStep('code');
    // The service itself refuses another code for a minute, so the button
    // waits exactly that long rather than promising sooner.
    setSeconds(60);
  }

  async function verify() {
    if (code.replace(/\D/g, '').length < 4) { setError('Enter the code from the message.'); return; }

    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'book', mobile: digits, otp: code.replace(/\D/g, '') }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);

    if (!res?.ok || !data?.ok) { setError(data?.error || 'That code did not work.'); return; }
    onSignedIn({ mobile: digits, name: data.user?.name || '', email: data.user?.email || '' });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40"
      />

      <div className="df-modal-in relative w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-[0_30px_70px_-30px_rgb(6_59_76/0.6)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-900"
        >
          <X size={17} aria-hidden="true" />
        </button>

        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Phone size={22} aria-hidden="true" />
        </span>

        <h2 className="mt-4 text-center text-[19px] font-semibold text-ink-900">
          {step === 'number' ? 'Enter your phone number' : 'Enter the code'}
        </h2>
        <p className="mt-1 text-center text-[13.5px] text-ink-400">
          {step === 'number'
            ? 'We’ll send you a text with a verification code'
            : `Sent to +91 ${digits}`}
        </p>

        {step === 'number' ? (
          <>
            <div className="mt-5 flex items-center overflow-hidden rounded-xl border border-line-strong focus-within:border-primary-500">
              <span className="border-r border-line-strong bg-surface-muted px-3 py-2.5 text-[15px] text-ink-500">+91</span>
              <input
                ref={firstField}
                value={digits}
                onChange={(e) => setMobile(e.target.value)}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2.5 text-[15px] outline-none"
              />
            </div>

            <div className="mt-3 rounded-xl border border-line bg-surface-muted/60 p-3">
              <p className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
                <ShieldCheck size={15} className="text-success" aria-hidden="true" />
                Security check
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-lg border border-line-strong bg-white px-3 py-2 text-[14px] font-medium text-ink-700">
                  {`${maths.a} + ${maths.b} = ?`}
                </span>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
                  inputMode="numeric"
                  placeholder="Answer"
                  className="w-28 rounded-lg border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => { setMaths(sum()); setAnswer(''); }}
                  aria-label="Another sum"
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white hover:text-primary-700"
                >
                  <RotateCw size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <input
              ref={firstField}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder="4-digit code"
              className="mt-5 w-full rounded-xl border border-line-strong px-3 py-2.5 text-center text-[18px] tracking-[0.3em] outline-none focus:border-primary-500"
            />
            <div className="mt-2 flex items-center justify-between text-[13px]">
              <button
                type="button"
                onClick={() => { setStep('number'); setCode(''); setError(''); }}
                className="text-ink-400 transition-colors hover:text-ink-700"
              >
                Change number
              </button>
              <button
                type="button"
                disabled={seconds > 0 || busy}
                onClick={() => sendCode(true)}
                className="font-medium text-primary-700 transition-colors hover:text-primary-800 disabled:text-ink-300"
              >
                {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}

        {error ? <p className="mt-3 text-center text-[13.5px] text-danger">{error}</p> : null}

        <button
          type="button"
          onClick={() => (step === 'number' ? sendCode() : verify())}
          disabled={busy}
          className={cx(
            'mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium text-white transition-colors',
            busy ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700',
          )}
        >
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {step === 'number' ? 'Continue' : 'Verify and continue'}
        </button>

        <p className="mt-3 text-center text-[12px] text-ink-400">
          Your number is used for this booking and to update you about the visit.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

/**
 * Delete an account from the web page: the registered number, the code sent
 * to it, then a final Delete button (POST /api/account/delete).
 */
const input = 'h-12 w-full rounded-xl border border-line-strong bg-white px-4 text-[16px] text-ink-900 outline-none focus:border-primary-600';
const primary = 'flex h-12 w-full items-center justify-center rounded-xl bg-primary-700 text-[15px] font-semibold text-white disabled:opacity-60';
const danger = 'flex h-12 w-full items-center justify-center rounded-xl bg-danger text-[15px] font-semibold text-white disabled:opacity-60';

async function call(body) {
  try {
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'No internet connection. Please try again.' };
  }
}

export default function DeleteAccountForm() {
  const [step, setStep] = useState('number'); // number | code | confirm | done
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (body, next) => {
    setBusy(true);
    setError('');
    const res = await call(body);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong. Please try again.');
      return null;
    }
    next(res);
    return res;
  };

  const sendCode = (e) => {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setError('Enter your 10-digit registered mobile number.');
    return run({ step: 'request', mobile }, () => setStep('code'));
  };

  const verify = (e) => {
    e.preventDefault();
    if (otp.trim().length < 4) return setError('Enter the code we sent you.');
    return run({ step: 'verify', mobile, otp: otp.trim() }, (res) => {
      setToken(res.token);
      setStep('confirm');
    });
  };

  const remove = () => run({ step: 'delete', token }, () => setStep('done'));

  if (step === 'done') {
    return (
      <div className="rounded-xl bg-[#e8f7ee] p-4 text-[14.5px] text-[#0a7a50]">
        <strong className="block text-[15.5px]">Your account has been deleted.</strong>
        Your profile, saved addresses, wishlist and sign-ins have been removed. Orders and invoices are kept only as long as the law requires.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {step === 'number' ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-[13.5px] font-medium text-ink-700" htmlFor="del-mobile">
            Registered mobile number
          </label>
          <div className="flex items-center gap-2">
            <span className="flex h-12 items-center rounded-xl border border-line bg-surface-muted px-3 text-[15px] text-ink-500">+91</span>
            <input
              id="del-mobile"
              className={input}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10 digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          {error ? <p className="text-[13.5px] text-danger">{error}</p> : null}
          <button type="submit" className={primary} disabled={busy}>
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-[14px] text-ink-500">
            We sent a code to <strong className="text-ink-900">+91 {mobile}</strong>.{' '}
            <button type="button" className="font-medium text-primary-700 underline" onClick={() => { setStep('number'); setOtp(''); setError(''); }}>
              Change
            </button>
          </p>
          <input
            className={`${input} tracking-[0.4em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error ? <p className="text-[13.5px] text-danger">{error}</p> : null}
          <button type="submit" className={primary} disabled={busy}>
            {busy ? 'Verifying…' : 'Verify OTP'}
          </button>
          <button type="button" className="w-full text-[14px] font-medium text-primary-700" disabled={busy} onClick={sendCode}>
            Send the code again
          </button>
        </form>
      ) : null}

      {step === 'confirm' ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-primary-50 p-3 text-[14px] text-ink-700">
            Number <strong>+91 {mobile}</strong> verified. Deleting removes your profile, saved addresses, wishlist and sign-ins on all devices.
            This cannot be undone.
          </p>
          {error ? <p className="text-[13.5px] text-danger">{error}</p> : null}
          <button type="button" className={danger} disabled={busy} onClick={remove}>
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2, Headset, Loader2, PhoneCall, X,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * "Request Call Back" — two fields and a button.
 *
 * The enquiry popup already on the site asks nine questions and only opens
 * twelve seconds in; plenty of people want to be phoned back and nothing else.
 * This asks for a name and a number, and lands in `request_call_back` — the
 * same inbox the admin panel already counts and shows, so nobody has to watch
 * a second place for leads.
 */

const input = 'h-11 w-full rounded-lg border border-line bg-white shadow-[0_1px_2px_rgb(16_24_40/0.06)] px-3 text-[14.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted';

const TIMINGS = ['Anytime', 'Morning', 'Afternoon', 'Evening'];

export default function CallbackButton({ className = '', label = 'Request Call Back' }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', timing: 'Anytime' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  // Escape closes it, and the page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Enter your name.'); return; }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/forms/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your request.');
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  function close() {
    setOpen(false);
    // Emptied only once it is out of sight, so the panel is not seen clearing
    // itself on the way out.
    setTimeout(() => {
      setStatus('idle');
      setForm({ name: '', mobile: '', timing: 'Anytime' });
      setError('');
    }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary-200 px-3.5 py-2 text-[14px] font-medium text-primary-800 transition-colors hover:bg-primary-50'}
      >
        <PhoneCall size={15} aria-hidden="true" />
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Request a call back"
            className="df-modal-in relative w-full rounded-t-3xl border border-line bg-white shadow-[0_24px_70px_-20px_rgb(16_24_40/0.35)] sm:max-w-[420px] sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Headset size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-ink-900">Request a call back</h2>
                <p className="mt-0.5 text-[13px] text-ink-400">
                  Leave your number — our team calls you back.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {status === 'sent' ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success" aria-hidden="true" />
                <p className="mt-2 text-[16px] font-semibold text-ink-900">Thank you!</p>
                <p className="mx-auto mt-1 max-w-[280px] text-[13.5px] leading-relaxed text-ink-500">
                  {'We will call you on '}
                  <span className="font-semibold text-ink-900">{form.mobile}</span>
                  {form.timing === 'Anytime' ? ' shortly.' : ' in the '}
                  {form.timing === 'Anytime' ? null : (
                    <span className="font-semibold text-ink-900">{form.timing.toLowerCase()}</span>
                  )}
                  {form.timing === 'Anytime' ? null : '.'}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 h-10 rounded-lg bg-primary-600 px-8 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3.5 px-5 py-5">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Your name</span>
                  <input
                    className={input}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    autoComplete="name"
                    disabled={status === 'sending'}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Mobile number</span>
                  <input
                    className={input}
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    autoComplete="tel"
                    disabled={status === 'sending'}
                  />
                </label>

                <fieldset>
                  <legend className="mb-1.5 text-[13px] font-medium text-ink-700">Best time to call</legend>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIMINGS.map((t) => (
                      <label
                        key={t}
                        className={cx(
                          'flex h-9 cursor-pointer items-center justify-center rounded-lg border text-[12.5px] font-medium transition-all',
                          form.timing === t
                            ? 'border-primary-600 bg-primary-600 font-semibold text-white shadow-[0_6px_16px_-8px_rgb(21_151_197/0.75)]'
                            : 'border-line bg-white text-ink-500 shadow-[0_1px_2px_rgb(16_24_40/0.06)] hover:border-primary-300 hover:shadow-[0_4px_12px_-6px_rgb(16_24_40/0.25)]',
                        )}
                      >
                        <input
                          type="radio"
                          name="timing"
                          className="sr-only"
                          checked={form.timing === t}
                          onChange={() => setForm((f) => ({ ...f, timing: t }))}
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error ? <p className="text-[13px] text-danger">{error}</p> : null}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-70"
                >
                  {status === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
                  {status === 'sending' ? 'Sending…' : 'Request Call Back'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

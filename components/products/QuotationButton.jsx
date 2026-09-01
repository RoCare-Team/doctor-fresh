'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { Input, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * "Download Brochure" on the product page.
 *
 * The same flow the current site runs: the button opens a Get Quotation form,
 * and name, email and phone are saved against the product in the `quotation`
 * table for the sales team to follow up. Nothing is downloaded on the spot —
 * that is what the existing button does too.
 */
export default function QuotationButton({ productId, productName }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    const previous = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    firstRef.current?.focus();

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, productId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your request.');

      setStatus('sent');
      window.location.assign(`/api/brochure/${productId}`);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus('idle'); }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong px-4 py-3.5 text-[14.5px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
      >
        <FileText size={16} aria-hidden="true" />
        Download Brochure
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/50"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quotation-title"
            className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <button
              ref={firstRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <h2 id="quotation-title" className="text-[19px] font-semibold text-ink-900">
              Get Quotation
            </h2>
            <p className="mt-1.5 line-clamp-2 text-[14px] text-ink-500">{productName}</p>

            {status === 'sent' ? (
              <div className="mt-6">
                <FormNote
                  status="done"
                  doneMessage="Thank you — your brochure is downloading, and our team will call you shortly."
                />

                {/* The download starts on its own; this is here for a second copy,
                    and for anyone whose browser blocked the first one. */}
                <a
                  href={`/api/brochure/${productId}`}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-500 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900"
                >
                  <Download size={17} aria-hidden="true" />
                  Download the PDF
                </a>

                <Button type="button" variant="outline" full className="mt-2.5" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-3.5">
                <Input label="Name" name="name" required maxLength={100} autoComplete="name" />
                <Input label="Email" name="email" type="email" maxLength={150} autoComplete="email" />
                <Input
                  label="Phone"
                  name="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={15}
                  autoComplete="tel"
                />

                <Button type="submit" full disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Submit'}
                </Button>

                {status === 'error' ? <FormNote status="error" error={error} /> : null}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

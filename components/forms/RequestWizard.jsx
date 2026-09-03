'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * "Submit your Request" — the enquiry popup the current site shows.
 *
 * Same fields, same dropdowns and the same lead system behind it; the calls go
 * through this site's own API so the browser is not talking to that host
 * directly. Shown only to signed-out visitors, and only once the page has been
 * open long enough that it is not interrupting the first thing they read.
 */

const COMPLAIN = [
  { value: '2', label: 'Service' },
  { value: '1', label: 'New Purchase' },
];
const SERVICE_TYPES = [
  { value: '2', label: 'Repair / Service' },
  { value: '1', label: 'Installation / Uninstallation' },
  { value: '3', label: 'AMC' },
];
const PURCHASE_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'spare_parts', label: 'Spare Parts' },
];
const USE_TYPES = [
  { value: '1', label: 'Domestic' },
  { value: '2', label: 'Commercial' },
];

export default function RequestWizard({ onClose }) {
  const [options, setOptions] = useState({ leadTypes: [], states: [] });
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', leadType: '', pincode: '',
    state: '', city: '', complainType: '2', serviceType: '2',
    purchaseType: 'product', domesticOrCommercial: '1',
    houseNo: '', area: '', nearBy: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    let live = true;
    fetch('/api/wizard/options')
      .then((r) => r.json())
      .then((d) => { if (live) setOptions({ leadTypes: d.leadTypes || [], states: d.states || [] }); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // Cities depend on the state, exactly as they do on the current form.
  useEffect(() => {
    if (!form.state) { setCities([]); return undefined; }

    let live = true;
    fetch(`/api/wizard/cities?state=${encodeURIComponent(form.state)}`)
      .then((r) => r.json())
      .then((d) => { if (live) setCities(d.cities || []); })
      .catch(() => {});
    return () => { live = false; };
  }, [form.state]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/wizard/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your request.');
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const isService = form.complainType === '2';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-900/55" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        // A small dialog rather than a near-full-screen panel — the size the
        // current site's popup uses. Two field columns inside 560px keeps the
        // inputs readable; the fields scroll, the header and Submit do not.
        // On phones it stays a bottom sheet.
        className="relative flex max-h-[88vh] w-full max-w-140 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-130 sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-primary-500 px-5 py-2.5">
          <h2 id="wizard-title" className="text-[16px] font-semibold text-white">
            Submit your Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={44} className="mx-auto text-success" aria-hidden="true" />
            <h3 className="mt-4 text-[18px] font-semibold text-ink-900">Request submitted</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
              Our team will call you shortly on {form.mobile}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg border border-line-strong px-5 py-2.5 text-[14.5px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            {/* Only the fields scroll. Submit sits below in its own bar, so it
                is reachable without scrolling to the end of the form. */}
            <div className="df-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <Legend>Basic details</Legend>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field
                  placeholder="Full Name"
                  value={form.name}
                  onChange={(v) => set({ name: v })}
                  required
                  maxLength={100}
                  autoComplete="name"
                />
                <Field
                  placeholder="10 Digit Mobile Number"
                  value={form.mobile}
                  onChange={(v) => set({ mobile: v.replace(/\D/g, '').slice(0, 10) })}
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                />
                <Field
                  placeholder="Your Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => set({ email: v })}
                  maxLength={150}
                  autoComplete="email"
                />
                <Picker
                  value={form.leadType}
                  onChange={(v) => set({ leadType: v })}
                  required
                  placeholder="Select Category"
                  options={options.leadTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
                <Field
                  placeholder="Enter Pin Code"
                  value={form.pincode}
                  onChange={(v) => set({ pincode: v.replace(/\D/g, '').slice(0, 6) })}
                  inputMode="numeric"
                />
                <Picker
                  value={form.state}
                  onChange={(v) => set({ state: v, city: '' })}
                  required
                  placeholder="Select State"
                  options={options.states.map((s) => ({ value: s, label: s }))}
                />
                <Picker
                  value={form.city}
                  onChange={(v) => set({ city: v })}
                  required
                  disabled={!form.state}
                  placeholder={form.state ? 'Select City' : 'Select a state first'}
                  options={cities.map((c) => ({ value: c.name, label: c.name }))}
                />
              </div>

              <Legend className="mt-4">What is it for?</Legend>

              {/* Three separate answers, so they keep their own groups — but on a
                  wide dialog they sit on one line instead of stacking. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Choices
                  name="complainType"
                  value={form.complainType}
                  onChange={(v) => set({ complainType: v })}
                  options={COMPLAIN}
                />

                {isService ? (
                  <Choices
                    name="serviceType"
                    value={form.serviceType}
                    onChange={(v) => set({ serviceType: v })}
                    options={SERVICE_TYPES}
                  />
                ) : (
                  <Choices
                    name="purchaseType"
                    value={form.purchaseType}
                    onChange={(v) => set({ purchaseType: v })}
                    options={PURCHASE_TYPES}
                  />
                )}

                <Choices
                  name="domesticOrCommercial"
                  value={form.domesticOrCommercial}
                  onChange={(v) => set({ domesticOrCommercial: v })}
                  options={USE_TYPES}
                />
              </div>

              <Legend className="mt-4">Address</Legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field
                  placeholder="House No. / Building No."
                  value={form.houseNo}
                  onChange={(v) => set({ houseNo: v })}
                  maxLength={120}
                />
                <Field
                  placeholder="Road Name / Area"
                  value={form.area}
                  onChange={(v) => set({ area: v })}
                  maxLength={160}
                />
                <Field
                  placeholder="Nearby landmark — shop, school, etc."
                  value={form.nearBy}
                  onChange={(v) => set({ nearBy: v })}
                  maxLength={200}
                  className="sm:col-span-2"
                />
              </div>

              {status === 'error' ? (
                <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[14px] text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-line px-5 py-3">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="h-11 w-full rounded-lg bg-primary-500 text-[14.5px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-60"
              >
                {status === 'sending' ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ small pieces */

function Legend({ children, className = '' }) {
  return (
    <p className={cx('mb-2 rounded-md bg-surface-muted px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-ink-500', className)}>
      {children}
    </p>
  );
}

const CONTROL = 'h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500';

function Field({ className = '', onChange, ...rest }) {
  return (
    <input
      {...rest}
      onChange={(e) => onChange(e.target.value)}
      className={cx(CONTROL, className)}
    />
  );
}

function Picker({ options, placeholder, className = '', onChange, ...rest }) {
  return (
    <select
      {...rest}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className={cx(CONTROL, 'disabled:bg-surface-muted disabled:text-ink-300', className)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Choices({ name, value, onChange, options, className = '' }) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === o.value
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-line-strong text-ink-700 hover:border-primary-400',
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

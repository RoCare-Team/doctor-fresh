'use client';

import { useEffect, useState } from 'react';
import {
  X, CheckCircle2, Headset, ArrowRight, ArrowLeft, Loader2, ChevronDown, Wrench, ShoppingBag,
  Home, Building2, Check,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * "Submit your Request" — the enquiry popup the current site shows.
 *
 * Same fields, same dropdowns and the same lead system behind it; the calls go
 * through this site's own API so the browser is not talking to that host
 * directly. Shown only to signed-out visitors, and only once the page has been
 * open long enough that it is not interrupting the first thing they read.
 *
 * Two short steps instead of one long form: first what the visit is for, then
 * who and where.
 */

const COMPLAIN = [
  { value: '2', label: 'Service', icon: Wrench },
  { value: '1', label: 'New Purchase', icon: ShoppingBag },
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
  { value: '1', label: 'Home', icon: Home },
  { value: '2', label: 'Commercial', icon: Building2 },
];

const input = 'h-10 w-full rounded-lg border border-white/80 bg-white/80 px-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted';

export default function RequestWizard({ onClose }) {
  const [options, setOptions] = useState({ leadTypes: [], states: [] });
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', leadType: '', pincode: '',
    state: '', city: '', complainType: '2', serviceType: '2',
    purchaseType: 'product', domesticOrCommercial: '1',
    houseNo: '', area: '', nearBy: '',
  });
  const [step, setStep] = useState(1);
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

  function next(event) {
    event.preventDefault();
    if (!form.leadType) { setError('Choose the product category.'); return; }
    setError('');
    setStep(2);
  }

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
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/25"
        style={{ animation: 'df-fade-in 0.25s ease-out' }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        // A small frosted-glass card: the page shows softly through it.
        className="df-modal-in relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/70 bg-white/70 shadow-[0_30px_80px_-20px_rgb(6_59_76/0.45),inset_0_1px_0_rgb(255_255_255/0.8)] backdrop-blur-2xl backdrop-saturate-150 sm:max-h-[min(34rem,90vh)] sm:max-w-[430px] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-white/60 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-primary-700 shadow-sm">
            <Headset size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="wizard-title" className="text-[15.5px] font-semibold leading-tight text-ink-900">
              {status === 'sent' ? 'Request submitted' : 'Submit your request'}
            </h2>
            <p className="text-[12px] text-ink-500">
              {status === 'sent' ? 'We will call you shortly' : 'Our expert will call you back'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-white/80 hover:text-ink-900"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {status !== 'sent' ? (
          <Stepper step={step} />
        ) : null}

        {status === 'sent' ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success" aria-hidden="true" />
            <p className="mt-2 text-[16px] font-semibold text-ink-900">Thank you!</p>
            <p className="mx-auto mt-1 max-w-[280px] text-[13.5px] leading-relaxed text-ink-500">
              {'Our team will call you shortly on '}
              <span className="font-semibold text-ink-900">{form.mobile}</span>
              .
            </p>
            <button type="button" onClick={onClose} className="mt-5 h-10 rounded-lg bg-primary-600 px-8 text-[14px] font-semibold text-white hover:bg-primary-700">
              Done
            </button>
          </div>
        ) : step === 1 ? (
          /* ------------------------------------------------ step 1: the need */
          <form onSubmit={next} className="flex min-h-0 flex-1 flex-col">
            <div className="df-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <Group label="I need">
                <div className="grid grid-cols-2 gap-2">
                  {COMPLAIN.map(({ value, label, icon: Icon }) => {
                    const active = form.complainType === value;
                    return (
                      <label
                        key={value}
                        className={cx(
                          'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border text-[14px] font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/25',
                          active ? 'border-primary-500 bg-primary-50/90 text-primary-800 shadow-sm' : 'border-white/80 bg-white/70 text-ink-700 hover:border-primary-300',
                        )}
                      >
                        <input type="radio" name="complainType" value={value} checked={active} onChange={() => set({ complainType: value })} className="sr-only" />
                        <Icon size={16} aria-hidden="true" />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </Group>

              <Group label={isService ? 'Type of service' : 'Looking for'}>
                {isService ? (
                  <Pills name="serviceType" value={form.serviceType} onChange={(v) => set({ serviceType: v })} options={SERVICE_TYPES} />
                ) : (
                  <Pills name="purchaseType" value={form.purchaseType} onChange={(v) => set({ purchaseType: v })} options={PURCHASE_TYPES} />
                )}
              </Group>

              <Group label="For">
                <Pills name="domesticOrCommercial" value={form.domesticOrCommercial} onChange={(v) => set({ domesticOrCommercial: v })} options={USE_TYPES} />
              </Group>

              <Labelled label="Product category" required>
                <Select
                  value={form.leadType}
                  onChange={(v) => { set({ leadType: v }); setError(''); }}
                  placeholder="Choose a category"
                  options={options.leadTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
              </Labelled>

              {error ? <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
            </div>

            <footer className="shrink-0 border-t border-white/60 px-4 py-3">
              <button type="submit" className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700">
                Continue
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </footer>
          </form>
        ) : (
          /* --------------------------------------- step 2: who and where */
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="df-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-2.5">
                <Labelled label="Full name" required className="col-span-2">
                  <input value={form.name} onChange={(e) => set({ name: e.target.value })} required maxLength={100} autoComplete="name" placeholder="Your name" className={input} />
                </Labelled>
                <Labelled label="Mobile number" required>
                  <input
                    value={form.mobile}
                    onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="\d{10}"
                    title="Enter a 10 digit mobile number"
                    placeholder="10 digits"
                    className={input}
                  />
                </Labelled>
                <Labelled label="Email" hint="optional">
                  <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} maxLength={150} autoComplete="email" placeholder="you@email.com" className={input} />
                </Labelled>
                <Labelled label="State" required>
                  <Select value={form.state} onChange={(v) => set({ state: v, city: '' })} required placeholder="Select" options={options.states.map((st) => ({ value: st, label: st }))} />
                </Labelled>
                <Labelled label="City" required>
                  <Select value={form.city} onChange={(v) => set({ city: v })} required disabled={!form.state} placeholder={form.state ? 'Select' : 'State first'} options={cities.map((c) => ({ value: c.name, label: c.name }))} />
                </Labelled>
                <Labelled label="Address" hint="optional" className="col-span-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={form.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" autoComplete="postal-code" placeholder="Pin code" aria-label="Pin code" className={input} />
                    <input value={form.houseNo} onChange={(e) => set({ houseNo: e.target.value })} maxLength={120} placeholder="House no." aria-label="House or building number" className={input} />
                    <input value={form.area} onChange={(e) => set({ area: e.target.value })} maxLength={160} placeholder="Area / road" aria-label="Road name or area" className={input} />
                    <input value={form.nearBy} onChange={(e) => set({ nearBy: e.target.value })} maxLength={200} placeholder="Landmark" aria-label="Nearby landmark" className={input} />
                  </div>
                </Labelled>
              </div>

              {status === 'error' ? (
                <p role="alert" className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-[13px] text-danger">{error}</p>
              ) : null}
            </div>

            <footer className="flex shrink-0 gap-2 border-t border-white/60 px-4 py-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setStatus('idle'); }}
                aria-label="Back"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/70 text-ink-700 transition-colors hover:border-primary-300"
              >
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {status === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
                {status === 'sending' ? 'Submitting…' : 'Submit request'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ small pieces */

function Labelled({
  label, required, hint, className = '', children,
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-700">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
        {hint ? <span className="font-normal text-ink-400">{` (${hint})`}</span> : null}
      </span>
      {children}
    </label>
  );
}

const STEPS = ['Your need', 'Your details'];

/** Numbered circles joined by a line: done ✓, current filled, next outlined. */
function Stepper({ step }) {
  return (
    <ol className="flex shrink-0 items-center gap-2 border-b border-white/60 px-5 py-3" aria-label={`Step ${step} of ${STEPS.length}`}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className={cx('flex items-center gap-2', i < STEPS.length - 1 && 'flex-1')} aria-current={current ? 'step' : undefined}>
            <span
              className={cx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold transition-all duration-300',
                done && 'bg-primary-600 text-white',
                current && 'bg-primary-600 text-white ring-4 ring-primary-500/20',
                !done && !current && 'border-2 border-ink-300/60 bg-white/70 text-ink-400',
              )}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : n}
            </span>
            <span className={cx('whitespace-nowrap text-[12.5px] font-semibold', current || done ? 'text-ink-900' : 'text-ink-400')}>{label}</span>
            {i < STEPS.length - 1 ? (
              <span className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-ink-300/40" aria-hidden="true">
                <span className={cx('absolute inset-y-0 left-0 rounded-full bg-primary-600 transition-all duration-500', done ? 'w-full' : 'w-0')} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Group({ label, children }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[12.5px] font-medium text-ink-700">{label}</legend>
      {children}
    </fieldset>
  );
}

function Select({
  value, onChange, options, placeholder, ...rest
}) {
  return (
    <span className="relative block">
      <select
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(input, 'cursor-pointer appearance-none pr-8', value ? '' : 'text-ink-300')}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-ink-900">{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
    </span>
  );
}

function Pills({
  name, value, onChange, options,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <label
            key={v}
            className={cx(
              'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/25',
              active ? 'border-primary-500 bg-primary-50/90 text-primary-800 shadow-sm' : 'border-white/80 bg-white/70 text-ink-700 hover:border-primary-300',
            )}
          >
            <input type="radio" name={name} value={v} checked={active} onChange={() => onChange(v)} className="sr-only" />
            {Icon ? <Icon size={15} aria-hidden="true" /> : null}
            {label}
          </label>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  X, CheckCircle2, User, Smartphone, Mail, Tag, MapPin, Map as MapIcon, Building2, Home,
  Signpost, Landmark, Headset, ArrowRight, Loader2,
  ChevronDown,
} from 'lucide-react';
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
  { value: '1', label: 'Domestic', icon: Home },
  { value: '2', label: 'Commercial', icon: Building2 },
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
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-[2px]"
        style={{ animation: 'df-fade-in 0.2s ease-out' }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        // One compact card: a slim header, the fields, and Submit. The fields
        // scroll if the screen is short; on phones it is a bottom sheet.
        className="relative flex max-h-[90vh] w-full max-w-140 flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_40px_80px_-30px_rgb(6_59_76/0.6)] sm:max-h-[min(34rem,90vh)] sm:rounded-2xl"
        style={{ animation: 'df-fade-in 0.25s ease-out' }}
      >
        <div className="flex shrink-0 items-center gap-3 bg-linear-to-r from-primary-500 to-primary-700 px-5 py-3 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Headset size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="wizard-title" className="text-[16px] font-semibold leading-tight !text-white">Submit your Request</h2>
            <p className="truncate text-[12px] text-white/75">Our expert will call you back shortly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/12">
              <CheckCircle2 size={36} className="text-success" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[19px] font-bold text-ink-900">Request submitted!</h3>
            <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-ink-500">
              {'Thank you. Our team will call you shortly on '}
              <span className="font-semibold text-ink-900">{form.mobile}</span>
              .
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 h-10 rounded-lg bg-primary-600 px-8 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="df-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <Heading>Basic details</Heading>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field icon={User} label="Full name" value={form.name} onChange={(v) => set({ name: v })} required maxLength={100} autoComplete="name" />
                <Field
                  icon={Smartphone}
                  label="Mobile number"
                  value={form.mobile}
                  onChange={(v) => set({ mobile: v.replace(/\D/g, '').slice(0, 10) })}
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  pattern="\d{10}"
                  title="Enter a 10 digit mobile number"
                />
                <Field icon={Mail} label="Email (optional)" type="email" value={form.email} onChange={(v) => set({ email: v })} maxLength={150} autoComplete="email" />
                <Picker
                  icon={Tag}
                  label="Product category"
                  value={form.leadType}
                  onChange={(v) => set({ leadType: v })}
                  required
                  options={options.leadTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
                <Picker
                  icon={MapIcon}
                  label="State"
                  value={form.state}
                  onChange={(v) => set({ state: v, city: '' })}
                  required
                  options={options.states.map((s) => ({ value: s, label: s }))}
                />
                <Picker
                  icon={Building2}
                  label={form.state ? 'City' : 'City (select state first)'}
                  value={form.city}
                  onChange={(v) => set({ city: v })}
                  required
                  disabled={!form.state}
                  options={cities.map((c) => ({ value: c.name, label: c.name }))}
                />
              </div>

              <Heading className="mt-4">What is it for?</Heading>
              <div className="flex flex-wrap items-center gap-2">
                <Chips name="complainType" value={form.complainType} onChange={(v) => set({ complainType: v })} options={COMPLAIN} />
                <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line-strong sm:block" />
                <Chips name="domesticOrCommercial" value={form.domesticOrCommercial} onChange={(v) => set({ domesticOrCommercial: v })} options={USE_TYPES} />
              </div>
              <div className="mt-2">
                {isService ? (
                  <Chips name="serviceType" value={form.serviceType} onChange={(v) => set({ serviceType: v })} options={SERVICE_TYPES} />
                ) : (
                  <Chips name="purchaseType" value={form.purchaseType} onChange={(v) => set({ purchaseType: v })} options={PURCHASE_TYPES} />
                )}
              </div>

              <Heading className="mt-4">Address</Heading>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field
                  icon={MapPin}
                  label="Pin code"
                  value={form.pincode}
                  onChange={(v) => set({ pincode: v.replace(/\D/g, '').slice(0, 6) })}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
                <Field icon={Home} label="House / Building no." value={form.houseNo} onChange={(v) => set({ houseNo: v })} maxLength={120} />
                <Field icon={Signpost} label="Road name / Area" value={form.area} onChange={(v) => set({ area: v })} maxLength={160} />
                <Field icon={Landmark} label="Nearby landmark" value={form.nearBy} onChange={(v) => set({ nearBy: v })} maxLength={200} />
              </div>

              {status === 'error' ? (
                <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[14px] text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-line px-5 py-3">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary-500 to-primary-700 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ small pieces */

function Heading({ children, className = '' }) {
  return (
    <p className={cx('mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-400', className)}>
      {children}
    </p>
  );
}

const CONTROL = 'peer h-11 w-full rounded-lg border border-line-strong bg-white pl-10 pr-3 pt-3.5 text-[14px] text-ink-900 outline-none transition-colors focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15';
// Label inside the box: centred while empty, small at the top once filled
// (or, for a text input, while typing). Built as one set so no two sizes clash.
const labelClass = (raised, liftOnFocus = true) => cx(
  "pointer-events-none absolute left-10 -translate-y-1/2 text-ink-400 transition-all",
  raised ? "top-3 text-[11px] font-medium" : "top-1/2 text-[14px]",
  liftOnFocus && !raised ? "peer-focus:top-3 peer-focus:text-[11px] peer-focus:font-medium" : "",
  "peer-focus:text-primary-700",
);

/** A text input whose label sits inside it and moves up once there is a value. */
function Field({ icon: Icon, label, className = '', onChange, value, ...rest }) {
  return (
    <label className={cx('relative block', className)}>
      <input
        {...rest}
        value={value}
        placeholder=" "
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      />
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 peer-focus:text-primary-500" aria-hidden="true" />
      <span className={labelClass(Boolean(value))}>
        {label}
        {rest.required ? <span className="text-danger"> *</span> : null}
      </span>
    </label>
  );
}

function Picker({ icon: Icon, label, options, className = '', onChange, value, ...rest }) {
  return (
    <label className={cx('relative block', className)}>
      <select
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(CONTROL, 'cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-surface-muted', value ? '' : 'text-transparent')}
      >
        <option value="" disabled hidden />
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink-900">{o.label}</option>
        ))}
      </select>
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 peer-focus:text-primary-500" aria-hidden="true" />
      <span className={labelClass(Boolean(value), false)}>
        {label}
        {rest.required ? <span className="text-danger"> *</span> : null}
      </span>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
    </label>
  );
}

function Chips({ name, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <label
            key={v}
            className={cx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary-500/30',
              active
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
            )}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={active}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {active && !Icon ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
            {label}
          </label>
        );
      })}
    </div>
  );
}

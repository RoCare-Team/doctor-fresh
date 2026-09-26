'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check, User, MapPin, CalendarClock, Wallet, Minus, Plus, Trash2, Loader2, ArrowRight, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { Wrench } from 'lucide-react';
import { useServiceCart } from '@/lib/service-cart';
import { formatPrice, cx } from '@/lib/utils';

/**
 * Booking the visit: the basket, who you are, where to come and when.
 *
 * Four steps, because that is what the booking needs and what it says on the
 * bar at the top. Nothing is charged here — the technician is paid after the
 * visit — so the last step confirms rather than collects a card.
 */
const STEPS = [
  { id: 'details', label: 'Details', icon: User },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'payment', label: 'Payment', icon: Wallet },
];

const SLOTS = ['9 am – 12 pm', '12 pm – 3 pm', '3 pm – 6 pm', '6 pm – 8 pm'];

function Bar({ at }) {
  const index = STEPS.findIndex((s) => s.id === at);

  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex flex-col items-center gap-1">
              <span
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold',
                  done ? 'bg-success text-white' : now ? 'bg-primary-600 text-white' : 'bg-surface-muted text-ink-400',
                )}
              >
                {done ? <Check size={15} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx('text-[12px]', now ? 'font-medium text-ink-900' : 'text-ink-400')}>{step.label}</span>
            </span>
            {i < STEPS.length - 1 ? (
              <span className={cx('h-px flex-1', done ? 'bg-success' : 'bg-line')} aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, icon: Icon, done, children, action }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
          {Icon ? <Icon size={16} className="text-primary-700" aria-hidden="true" /> : null}
          {title}
          {done ? <Check size={15} className="text-success" aria-hidden="true" /> : null}
        </h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Change({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[13px] font-medium text-primary-700 transition-colors hover:text-primary-800">
      Change
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right text-ink-900">{value}</dd>
    </div>
  );
}

function Field({ label, name, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="h-11 w-full rounded-lg border border-line-strong px-3 text-[14.5px] outline-none focus:border-primary-500"
        {...rest}
      />
    </label>
  );
}

export default function ServiceCheckout({ states = [], premises = [] }) {
  const router = useRouter();
  const [lines, cart] = useServiceCart();
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', pincode: '', houseNo: '', area: '', nearBy: '', state: '', city: '', premises: premises[0]?.id || '', date: '', slot: SLOTS[0],
  });
  const [cities, setCities] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  // The number is already known — it is how they signed in.
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.replace('/book'); return; }
        setForm((f) => ({ ...f, mobile: d.user.mobile || '', name: f.name || d.user.name || '' }));
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!form.state) { setCities([]); return; }
    fetch(`/api/services/cities?state=${encodeURIComponent(form.state)}`)
      .then((r) => r.json())
      .then((d) => setCities(d.cities || []))
      .catch(() => setCities([]));
  }, [form.state]);

  if (cart.ready && !lines.length && status !== 'done') {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
        <p className="text-[16px] font-semibold text-ink-900">Your cart is empty</p>
        <Link href="/water-purifier-service" className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary-600 px-5 text-[14.5px] font-medium text-white">
          Browse services
        </Link>
      </div>
    );
  }

  const detailsDone = Boolean(form.name.trim() && form.mobile.trim());
  const addressDone = Boolean(form.pincode.trim() && form.houseNo.trim() && form.area.trim() && form.state && form.city);
  const scheduleDone = Boolean(form.date && form.slot);

  async function book(payment) {
    setStatus('sending');
    setError('');

    const res = await fetch('/api/services/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        payment,
        serviceGroup: lines[0]?.group || '',
        path: '/book',
        services: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price })),
      }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setError(data?.error || 'Could not book the visit. Please try again.');
      setStatus('error');
      return;
    }

    // Paying now: the basket is cleared as the browser leaves for the gateway,
    // which comes back to /book/done whichever way the payment goes.
    cart.clear();
    if (data.redirect) { window.location.href = data.redirect; return; }
    window.location.href = `/book/done?ref=${encodeURIComponent(data.ref || '')}`;
  }


  return (
    <>
      <Bar at={step} />

      <div className="space-y-4">
        {/* One step at a time: the whole booking on one screen reads as a form
            to fill top to bottom, and people skip half of it. */}
        {step === 'details' ? (
          <>
        <Card title={`Services (${lines.length})`}>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                  {l.image
                    ? <Image src={l.image} alt="" fill sizes="56px" className="object-cover" unoptimized />
                    : <span className="flex h-full w-full items-center justify-center"><Wrench size={16} className="text-ink-300" aria-hidden="true" /></span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-ink-900">{l.name}</span>
                  <span className="mt-1 inline-flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg border border-line-strong">
                      <button type="button" onClick={() => cart.setQty(l, l.qty - 1)} aria-label="One fewer" className="px-2 py-1 text-ink-500">
                        <Minus size={13} aria-hidden="true" />
                      </button>
                      <span className="min-w-7 text-center text-[13.5px]">{l.qty}</span>
                      <button type="button" onClick={() => cart.setQty(l, l.qty + 1)} aria-label="One more" className="px-2 py-1 text-ink-500">
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </span>
                    <button type="button" onClick={() => cart.remove(l.id)} aria-label={`Remove ${l.name}`} className="rounded p-1.5 text-ink-300 hover:text-danger">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </span>
                </span>
                <span className="text-[14.5px] font-semibold text-ink-900">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[15px]">
            <span className="text-ink-700">Total</span>
            <span className="font-semibold text-primary-800">{formatPrice(cart.total)}</span>
          </p>
        </Card>

        <Card title="Customer details" icon={User} done={detailsDone}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Full name" name="name" value={form.name} onChange={set} placeholder="Your name" required />
            <Field label="Mobile number" name="mobile" value={form.mobile} onChange={set} readOnly />
            <Field label="Email (optional)" name="email" value={form.email} onChange={set} type="email" placeholder="you@example.com" className="sm:col-span-2" />
          </div>
        </Card>

          </>
        ) : null}

        {step === 'address' ? (
        <Card title="Service address" icon={MapPin} done={addressDone}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="House / flat number" name="houseNo" value={form.houseNo} onChange={set} required />
            <Field label="Area / locality" name="area" value={form.area} onChange={set} required />
            <Field label="Landmark (optional)" name="nearBy" value={form.nearBy} onChange={set} />
            <Field label="Pin code" name="pincode" value={form.pincode} onChange={set} inputMode="numeric" maxLength={6} required />

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-ink-700">State</span>
              <select
                value={form.state}
                onChange={(e) => { set('state', e.target.value); set('city', ''); }}
                className="h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none focus:border-primary-500"
              >
                <option value="">Select state</option>
                {states.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-ink-700">City</span>
              <select
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                disabled={!form.state}
                className="h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none focus:border-primary-500 disabled:bg-surface-muted"
              >
                <option value="">{form.state ? 'Select city' : 'Choose a state first'}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {premises.length ? (
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[13px] font-medium text-ink-700">Premises</span>
                <select
                  value={form.premises}
                  onChange={(e) => set('premises', e.target.value)}
                  className="h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none focus:border-primary-500"
                >
                  {premises.map((p) => <option key={p.id} value={p.id}>{p.label || p.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        </Card>
        ) : null}

        {step === 'schedule' ? (
        <Card title="Schedule the visit" icon={CalendarClock} done={scheduleDone}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Preferred date"
              name="date"
              value={form.date}
              onChange={set}
              type="date"
              min={new Date().toISOString().slice(0, 10)}
            />
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-ink-700">Preferred time</span>
              <select
                value={form.slot}
                onChange={(e) => set('slot', e.target.value)}
                className="h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none focus:border-primary-500"
              >
                {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-[13px] text-ink-400">
            The team calls to confirm before the technician leaves, so a slot is a preference rather than a promise.
          </p>
        </Card>
        ) : null}

        {step === 'payment' ? (
          <>
            <Card title="Customer details" icon={User} done action={<Change onClick={() => setStep('details')} />}>
              <dl className="space-y-1 text-[14px]">
                <Row label="Name" value={form.name} />
                <Row label="Phone" value={`+91 ${form.mobile}`} />
                {form.email ? <Row label="Email" value={form.email} /> : null}
              </dl>
            </Card>

            <Card title="Service address" icon={MapPin} done action={<Change onClick={() => setStep('address')} />}>
              <p className="text-[14px] text-ink-600">
                {[form.houseNo, form.area, form.nearBy, form.city, form.state, form.pincode].filter(Boolean).join(', ')}
              </p>
            </Card>

            <Card title="Appointment time" icon={CalendarClock} done action={<Change onClick={() => setStep('schedule')} />}>
              <p className="text-[14px] text-ink-600">{[form.date, form.slot].filter(Boolean).join('  ·  ')}</p>
            </Card>

            <Card title="Payment options" icon={Wallet}>
              <p className="mb-3 flex items-center justify-between text-[15px]">
                <span className="text-ink-700">Amount</span>
                <span className="font-semibold text-primary-800">{formatPrice(cart.total)}</span>
              </p>

              <button
                type="button"
                onClick={() => book('online')}
                disabled={status === 'sending'}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {status === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
                Proceed to payment
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => book('after')}
                disabled={status === 'sending'}
                className="mt-2.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-muted px-5 text-[15px] font-medium text-ink-700 transition-colors hover:bg-line disabled:opacity-60"
              >
                <Wallet size={16} aria-hidden="true" />
                Pay after service
              </button>

              <p className="mt-3 text-center text-[12.5px] text-ink-400">
                Paying now is optional — the technician takes cash, UPI or card after the visit either way.
              </p>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: 'Secure payment' },
                { icon: CalendarClock, label: 'Flexible timing' },
                { icon: Check, label: 'Verified technicians' },
              ].map((x) => (
                <span key={x.label} className="rounded-xl border border-line bg-white px-3 py-3 text-center">
                  <x.icon size={17} className="mx-auto text-success" aria-hidden="true" />
                  <span className="mt-1 block text-[12.5px] text-ink-500">{x.label}</span>
                </span>
              ))}
            </div>
          </>
        ) : null}

        {error ? <p className="text-[13.5px] text-danger">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 pb-2">
          {step === 'details' ? (
            <Link
              href="/book"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-strong px-4 text-[14.5px] text-ink-700 transition-colors hover:border-primary-300"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to cart
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => { setError(''); setStep(STEPS[STEPS.findIndex((x) => x.id === step) - 1].id); }}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-strong px-4 text-[14.5px] text-ink-700 transition-colors hover:border-primary-300"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
          )}

          {step === 'payment' ? null : (
            <button
              type="button"
              onClick={() => {
                if (step === 'details' && !detailsDone) { setError('Enter your name.'); return; }
                if (step === 'address' && !addressDone) { setError('Fill in the address.'); return; }
                if (step === 'schedule' && !scheduleDone) { setError('Pick a date and a time.'); return; }
                setError('');
                setStep(STEPS[STEPS.findIndex((x) => x.id === step) + 1].id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 sm:flex-none"
            >
              Continue
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

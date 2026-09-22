'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck, CalendarCheck, Check, ChevronDown, ChevronRight, Clock, Hammer, Loader2, Minus, Plus,
  ShieldCheck, ShoppingCart, Star, Trash2, Wrench, X, CheckCircle2, MapPin, Phone, Sparkles, LayoutGrid, Droplets, Cpu,
} from 'lucide-react';
import { formatPrice, cx } from '@/lib/utils';

// One visit covers a household or a small office; more units than this is a
// site survey, which the team quotes on a call rather than books online.
const MAX_PER_SERVICE = 5;

const PROMISES = [
  { icon: BadgeCheck, text: 'Certified technicians' },
  { icon: ShieldCheck, text: 'Genuine spare parts' },
  { icon: Clock, text: 'Service within 24 hours' },
];

/** An icon for each service group, by its name. */
const groupIcon = (label) => (/amc/i.test(label) ? CalendarCheck : /install/i.test(label) ? Hammer : Wrench);

const field = 'h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[14.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-surface-muted disabled:text-ink-300';
const label = 'mb-1.5 block text-[13px] font-medium text-ink-700';

/* ------------------------------------------------------------------ pieces */

function Stepper({ qty, onChange, name, small }) {
  return (
    <span className={cx('inline-flex items-center overflow-hidden rounded-lg border border-primary-500 bg-white', small ? 'h-8' : 'h-9')}>
      <button type="button" onClick={() => onChange(qty - 1)} aria-label={`Remove one ${name}`} className="flex h-full w-8 items-center justify-center text-primary-700 hover:bg-primary-50">
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="min-w-6 text-center text-[14px] font-semibold text-primary-800">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= MAX_PER_SERVICE}
        aria-label={`Add one ${name}`}
        title={qty >= MAX_PER_SERVICE ? `Up to ${MAX_PER_SERVICE} per booking` : undefined}
        className="flex h-full w-8 items-center justify-center text-primary-700 hover:bg-primary-50 disabled:text-ink-300 disabled:hover:bg-transparent"
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

/** One service in the middle list: what it covers on the left; picture, Add to cart and price on the right. */
function ServiceItem({
  s, qty, setQty, flash,
}) {
  const [more, setMore] = useState(false);
  const off = s.mrp > s.price;
  const points = more ? s.points : s.points.slice(0, 2);

  return (
    <li
      id={`svc-${s.id}`}
      className={cx(
        'scroll-mt-40 flex gap-4 rounded-2xl border bg-white p-4 transition-all duration-300 sm:p-5',
        qty ? 'border-primary-400 shadow-[0_0_0_3px_var(--color-primary-100)]' : 'border-line hover:shadow-[0_14px_34px_-26px_rgb(6_59_76/0.6)]',
        flash && 'ring-4 ring-warning/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[16.5px] font-semibold leading-snug text-ink-900">{s.name}</h3>
        {s.points.length ? (
          <ul className="mt-2 space-y-1.5">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-500">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />
                <span className="min-w-0">{p}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {s.points.length > 2 ? (
          <button type="button" onClick={() => setMore((v) => !v)} className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-primary-700 hover:text-primary-800">
            {more ? 'Show less' : 'Show more'}
            <ChevronDown size={14} className={cx('transition-transform', more && 'rotate-180')} aria-hidden="true" />
          </button>
        ) : null}
        {qty >= MAX_PER_SERVICE ? (
          <p className="mt-2 text-[12px] text-ink-400">
            {`Maximum ${MAX_PER_SERVICE} per booking. For more, call `}
            <a href="tel:9311587716" className="font-medium text-primary-700">+91-9311587716</a>
          </p>
        ) : null}
      </div>

      <div className="flex w-[118px] shrink-0 flex-col items-center gap-2.5 sm:w-[132px]">
        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-xl border border-line bg-surface-muted">
          {s.image ? (
            <Image src={s.image} alt="" fill sizes="72px" className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center"><Wrench size={22} className="text-ink-300" aria-hidden="true" /></span>
          )}
        </div>
        {qty ? (
          <Stepper qty={qty} name={s.name} onChange={(n) => setQty(s.id, n)} />
        ) : (
          <button
            type="button"
            onClick={() => setQty(s.id, 1)}
            className="h-9 w-full rounded-lg bg-primary-700 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-800"
          >
            Add to Cart
          </button>
        )}
        <p className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-bold text-primary-700">{formatPrice(s.price)}</span>
          {off ? <span className="text-[12.5px] text-ink-300 line-through">{formatPrice(s.mrp)}</span> : null}
        </p>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------- checkout */

function CheckoutDialog({
  lines, total, saved, count, states, premises, onClose, onBooked, serviceGroup, path, setQty,
}) {
  const [state, setState] = useState('');
  const [cities, setCities] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state) { setCities([]); return undefined; }
    let cancelled = false;
    fetch(`/api/services/cities?state=${encodeURIComponent(state)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCities(d.cities || []); })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, [state]);

  // Esc closes; the page behind does not scroll while the dialog is open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && status !== 'sending') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose, status]);

  async function book(event) {
    event.preventDefault();
    if (!lines.length) { setError('Choose a service first.'); setStatus('error'); return; }
    setStatus('sending');
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const res = await fetch('/api/services/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, serviceGroup, path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not book the visit.');
      setStatus('done');
      onBooked();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/50 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => status !== 'sending' && onClose()} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="checkout-title" className="text-[18px] font-semibold text-ink-900">
              {status === 'done' ? 'Booking confirmed' : 'Where should we come?'}
            </h2>
            {status !== 'done' ? <p className="text-[13px] text-ink-400">Our team calls you to confirm the time slot.</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={status === 'sending'} aria-label="Close" className="rounded-full p-2 text-ink-400 hover:bg-surface-muted hover:text-ink-900">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {status === 'done' ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={34} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-ink-900">Thank you — your visit is booked</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[14.5px] text-ink-500">Our service team will call you shortly to confirm the time slot.</p>
            <button type="button" onClick={onClose} className="mt-6 h-11 rounded-xl bg-primary-600 px-8 text-[14.5px] font-semibold text-white hover:bg-primary-700">Done</button>
          </div>
        ) : (
          <form onSubmit={book} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {/* what is being booked */}
              <div className="rounded-2xl bg-surface-muted p-3.5">
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate font-medium text-ink-900">{l.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Stepper small qty={l.qty} name={l.name} onChange={(n) => setQty(l.id, n)} />
                        <span className="w-16 text-right font-semibold text-ink-900">{formatPrice(l.price * l.qty)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mb-3 mt-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400"><Phone size={14} aria-hidden="true" />Contact</p>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div><label className={label} htmlFor="bk-name">Full name *</label><input id="bk-name" name="name" required autoComplete="name" placeholder="Your name" className={field} /></div>
                <div><label className={label} htmlFor="bk-mobile">Mobile number *</label><input id="bk-mobile" name="mobile" type="tel" required pattern="[0-9]{10}" maxLength={10} inputMode="numeric" autoComplete="tel" placeholder="10 digit number" className={field} /></div>
                <div><label className={label} htmlFor="bk-email">Email</label><input id="bk-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className={field} /></div>
              </div>

              <p className="mb-3 mt-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400"><MapPin size={14} aria-hidden="true" />Address</p>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div><label className={label} htmlFor="bk-house">House / flat no. *</label><input id="bk-house" name="houseNo" required placeholder="House / flat no." className={field} /></div>
                <div className="sm:col-span-2"><label className={label} htmlFor="bk-area">Area *</label><input id="bk-area" name="area" required placeholder="Street, area" className={field} /></div>
                <div>
                  <label className={label} htmlFor="bk-state">State *</label>
                  <select id="bk-state" name="state" required value={state} onChange={(e) => setState(e.target.value)} className={field}>
                    <option value="">Select state</option>
                    {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="bk-city">City *</label>
                  <select id="bk-city" name="city" required disabled={!cities.length} className={field}>
                    <option value="">{state ? 'Select city' : 'Choose a state first'}</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={label} htmlFor="bk-pin">Pin code *</label><input id="bk-pin" name="pincode" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="postal-code" placeholder="6 digit pin code" className={field} /></div>
                <div className="sm:col-span-2"><label className={label} htmlFor="bk-near">Nearby landmark</label><input id="bk-near" name="nearBy" placeholder="School, shop or place nearby" className={field} /></div>
                <div>
                  <label className={label} htmlFor="bk-prem">Premises</label>
                  <select id="bk-prem" name="premises" className={field}>
                    <option value="">Select</option>
                    {premises.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {status === 'error' ? <p role="alert" className="mt-4 rounded-xl bg-danger/5 px-3.5 py-2.5 text-[14px] text-danger">{error}</p> : null}
            </div>

            <footer className="flex items-center gap-3 border-t border-line bg-white px-5 py-4 sm:px-6">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-ink-400">{count} service{count === 1 ? '' : 's'}{saved > 0 ? ` · you save ${formatPrice(saved)}` : ''}</span>
                <span className="block text-[19px] font-bold text-ink-900">{formatPrice(total)}</span>
              </span>
              <button type="submit" disabled={status === 'sending' || !lines.length} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-600 px-6 text-[15px] font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60">
                {status === 'sending' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
                {status === 'sending' ? 'Booking…' : 'Confirm booking'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

const BANNER_POINTS = [
  { icon: Droplets, text: '100% pure water' },
  { icon: Cpu, text: 'Advanced RO technology' },
  { icon: Wrench, text: 'Expert service' },
  { icon: ShieldCheck, text: 'Quality assurance' },
];

/** The page's own banner: its title, what the visit includes and how to book — with the service photos. */
function Banner({ title, photos, phone, tel }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-900 via-primary-800 to-primary-600 p-5 text-white shadow-[0_18px_40px_-26px_rgb(6_59_76/0.9)] sm:p-6">
      <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles size={12} aria-hidden="true" />
            Pure water, healthy life
          </p>
          <p className="mt-2.5 text-[22px] font-bold leading-tight sm:text-[27px]">{title}</p>
          <p className="mt-1 text-[13px] text-white/75">Pure &amp; safe drinking water for a healthier family.</p>
          <ul className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            {BANNER_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 text-[11.5px] leading-tight text-white/85">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20"><Icon size={14} aria-hidden="true" /></span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-4 inline-flex flex-wrap items-center overflow-hidden rounded-full bg-white/10 text-[12.5px] font-semibold ring-1 ring-white/20">
            <a href="#svc-list" className="bg-white px-3.5 py-1.5 text-primary-800">Book service now</a>
            {phone ? <a href={`tel:${tel || phone}`} className="inline-flex items-center gap-1.5 px-3.5 py-1.5"><Phone size={13} aria-hidden="true" />{phone}</a> : null}
          </div>
        </div>
        {/* the service photos, stacked */}
        <div className="relative hidden h-40 w-44 shrink-0 md:block">
          {photos.slice(0, 3).map((src, i) => (
            <span
              key={src}
              className={cx(
                'absolute overflow-hidden rounded-2xl border-4 border-white/90 shadow-xl',
                i === 0 && 'right-0 top-0 h-28 w-28 rotate-3',
                i === 1 && 'bottom-0 left-0 h-24 w-24 -rotate-6',
                i === 2 && 'bottom-1 right-6 h-16 w-16 rotate-6',
              )}
            >
              <Image src={src} alt="" fill sizes="112px" className="object-cover" unoptimized />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Booking a service visit, laid out like the RO Care service page: the page's
 * title and a picture grid of the services on the left, the banner and the
 * services in the middle, the page's introduction and the cart on the right.
 *
 * The services, prices, coverage and the booking itself all come from the RO
 * Care service system — the same one the current /water-purifier-service page
 * books through. Nothing is priced or listed locally.
 */
export default function ServiceBooking({
  services = [], groups = [], states = [], premises = [], path, title, intro, phone, tel,
}) {
  const [picked, setPicked] = useState({}); // service id → qty
  const [checkout, setCheckout] = useState(false);
  const [booked, setBooked] = useState(false);
  const [flash, setFlash] = useState(null);
  const [readMore, setReadMore] = useState(false);

  const lines = useMemo(
    () => Object.entries(picked)
      .map(([id, qty]) => ({ ...services.find((s) => s.id === id), qty }))
      .filter((l) => l.id),
    [picked, services],
  );

  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const saved = lines.reduce((sum, l) => sum + Math.max(0, l.mrp - l.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  const setQty = (id, qty) => setPicked((current) => {
    const next = { ...current };
    if (qty <= 0) delete next[id];
    else next[id] = Math.min(qty, MAX_PER_SERVICE);
    return next;
  });

  /** From the picture grid: bring that service into view and mark it for a moment. */
  function show(id) {
    document.getElementById(`svc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1400);
  }

  if (!services.length) return null;
  const heading = title || 'Water Purifier Service';
  const photos = services.map((x) => x.image).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const grouped = groups.map((g) => ({ ...g, items: services.filter((x) => x.group === g.id) })).filter((g) => g.items.length);

  return (
    <section id="book" className="scroll-mt-39 border-b border-line bg-linear-to-b from-primary-50/70 to-surface-muted/40">
      <div className="df-container pb-10 pt-5 md:pb-14 md:pt-7">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_290px] xl:gap-6">
          {/* ------------------------------------------------ left column */}
          <div className="min-w-0 space-y-4 lg:sticky lg:top-34.5 lg:self-start">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_12px_30px_-26px_rgb(6_59_76/0.6)]">
              <p className="border-l-4 border-primary-600 pl-3 text-[17px] font-bold leading-snug text-ink-900">{heading}</p>
              <p className="mt-2 flex items-center gap-1.5 pl-4 text-[12.5px] text-ink-500">
                <Sparkles size={13} className="text-warning" aria-hidden="true" />
                Premium service package
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_30px_-26px_rgb(6_59_76/0.6)]">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 text-white"><LayoutGrid size={18} aria-hidden="true" /></span>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-ink-900">Select Service</span>
                  <span className="block text-[12px] text-ink-400">Choose your package</span>
                </span>
              </div>
              <ul className="df-no-scrollbar flex gap-3 overflow-x-auto p-4 lg:grid lg:grid-cols-3 lg:gap-x-2 lg:gap-y-4 lg:overflow-visible">
                {services.map((x) => (
                  <li key={x.id} className="w-[76px] shrink-0 lg:w-auto">
                    <button type="button" onClick={() => show(x.id)} className="group flex w-full flex-col items-center gap-1.5 text-center">
                      <span className={cx('relative h-14 w-14 overflow-hidden rounded-xl border-2 bg-surface-muted transition-colors', picked[x.id] ? 'border-primary-500' : 'border-transparent group-hover:border-primary-200')}>
                        {x.image ? <Image src={x.image} alt="" fill sizes="56px" className="object-cover" unoptimized /> : <span className="flex h-full w-full items-center justify-center"><Wrench size={18} className="text-ink-300" aria-hidden="true" /></span>}
                        {picked[x.id] ? <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white"><Check size={10} strokeWidth={3} aria-hidden="true" /></span> : null}
                      </span>
                      <span className="line-clamp-2 text-[11.5px] leading-tight text-ink-700 group-hover:text-primary-800">{x.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="hidden space-y-2 rounded-2xl border border-line bg-white px-4 py-3.5 text-[12.5px] text-ink-700 lg:block">
              {PROMISES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2"><Icon size={14} className="shrink-0 text-success" aria-hidden="true" />{text}</li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------- middle column */}
          <div className="min-w-0 space-y-4">
            <Banner title={heading} photos={photos} phone={phone} tel={tel} />

            <div id="svc-list" className="scroll-mt-40 space-y-6">
              {grouped.map((g) => {
                const Icon = groupIcon(g.label);
                return (
                  <div key={g.id}>
                    <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
                      <Icon size={15} className="text-primary-700" aria-hidden="true" />
                      {g.label}
                    </p>
                    <ul className="space-y-3">
                      {g.items.map((x) => <ServiceItem key={x.id} s={x} qty={picked[x.id] || 0} setQty={setQty} flash={flash === x.id} />)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ----------------------------------------------- right column */}
          <aside className="hidden xl:sticky xl:top-34.5 xl:block xl:self-start">
            {intro ? (
              <div className="rounded-2xl border border-line bg-white p-5 text-center shadow-[0_12px_30px_-26px_rgb(6_59_76/0.6)]">
                <p className={cx('text-[13.5px] leading-relaxed text-ink-500', !readMore && 'line-clamp-6')}>
                  <strong className="font-semibold text-ink-900">{`Best ${heading}: `}</strong>
                  {intro}
                </p>
                <button type="button" onClick={() => setReadMore((v) => !v)} className="mt-2 text-[13px] font-semibold text-primary-700 hover:text-primary-800">
                  {readMore ? 'Read less' : 'Read more'}
                </button>
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_44px_-30px_rgb(6_59_76/0.6)]">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
                <ShoppingCart size={17} className="text-primary-700" aria-hidden="true" />
                <span className="text-[15px] font-semibold text-ink-900">Your cart</span>
                {count ? <span className="ml-auto rounded-full bg-primary-600 px-2 text-[12px] font-semibold text-white">{count}</span> : null}
              </div>
              {lines.length ? (
                <>
                  <ul className="max-h-64 divide-y divide-line overflow-y-auto px-5">
                    {lines.map((l) => (
                      <li key={l.id} className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-[13.5px] font-medium leading-snug text-ink-900">{l.name}</span>
                          <button type="button" onClick={() => setQty(l.id, 0)} aria-label={`Remove ${l.name}`} className="p-0.5 text-ink-300 hover:text-danger"><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Stepper small qty={l.qty} name={l.name} onChange={(n) => setQty(l.id, n)} />
                          <span className="text-[14px] font-semibold text-ink-900">{formatPrice(l.price * l.qty)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line px-5 py-4">
                    {saved > 0 ? <p className="mb-2 flex justify-between text-[13px] font-medium text-success"><span>Discount</span><span>{`− ${formatPrice(saved)}`}</span></p> : null}
                    <p className="flex items-baseline justify-between"><span className="text-[14px] font-semibold text-ink-900">To pay</span><span className="text-[20px] font-bold text-ink-900">{formatPrice(total)}</span></p>
                    <p className="mt-1 text-[11.5px] text-ink-400">Pay after the visit. Spare parts as per rate card.</p>
                    <button type="button" onClick={() => setCheckout(true)} className="mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-700 text-[14.5px] font-semibold text-white hover:bg-primary-800">
                      Book now
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-5 py-7 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-300">
                    {booked ? <CheckCircle2 size={22} className="text-success" aria-hidden="true" /> : <ShoppingCart size={20} aria-hidden="true" />}
                  </span>
                  <p className="mt-2.5 text-[14px] font-semibold text-ink-700">{booked ? 'Booking received' : 'Your cart is empty'}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-400">{booked ? 'We will call you to confirm the slot.' : 'Add a service to book a visit.'}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ------------------------------ cart bar (no right column here) */}
      {lines.length ? (
        <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-10px_30px_-20px_rgb(6_59_76/0.5)] backdrop-blur xl:hidden">
          <div className="df-container flex items-center gap-3 !px-0">
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-ink-400">
                {count} service{count === 1 ? '' : 's'}
                {saved > 0 ? ` · saving ${formatPrice(saved)}` : ''}
              </span>
              <span className="block text-[18px] font-bold text-ink-900">{formatPrice(total)}</span>
            </span>
            <button type="button" onClick={() => setCheckout(true)} className="inline-flex h-11 items-center gap-1 rounded-xl bg-primary-700 px-5 text-[14.5px] font-semibold text-white">
              Book now
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {checkout ? (
        <CheckoutDialog
          lines={lines}
          total={total}
          saved={saved}
          count={count}
          states={states}
          premises={premises}
          setQty={setQty}
          // The first service chosen decides which team the visit goes to.
          serviceGroup={lines[0]?.group || groups[0]?.id || '2'}
          path={path}
          onClose={() => setCheckout(false)}
          onBooked={() => { setPicked({}); setBooked(true); }}
        />
      ) : null}
    </section>
  );
}

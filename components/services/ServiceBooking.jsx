'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck, Check, ChevronRight, Minus, Plus, ShieldCheck, Star, Trash2, Wrench,
} from 'lucide-react';
import { Input, Select, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import Reveal from '@/components/common/Reveal';
import { formatPrice, cx } from '@/lib/utils';

const PROMISES = [
  'Affordable, upfront pricing',
  'Certified technicians',
  'Genuine spare parts',
  'Service within 24 hours',
];

/**
 * Booking a service visit.
 *
 * The services, prices, coverage and the booking itself all come from the RO
 * Care service system — the same one the current /water-purifier-service page
 * books through. Nothing is priced or listed locally.
 */
export default function ServiceBooking({ services = [], groups = [], states = [], premises = [], path }) {
  const [group, setGroup] = useState(groups[0]?.id || '2');
  const [picked, setPicked] = useState({}); // service id → qty
  const [state, setState] = useState('');
  const [cities, setCities] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const visible = services.filter((s) => s.group === group);
  const lines = useMemo(
    () => Object.entries(picked)
      .map(([id, qty]) => ({ ...services.find((s) => s.id === id), qty }))
      .filter((l) => l.id),
    [picked, services],
  );

  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const saved = lines.reduce((sum, l) => sum + Math.max(0, l.mrp - l.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  useEffect(() => {
    if (!state) { setCities([]); return undefined; }
    let cancelled = false;
    fetch(`/api/services/cities?state=${encodeURIComponent(state)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCities(d.cities || []); })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, [state]);

  const setQty = (id, qty) => setPicked((current) => {
    const next = { ...current };
    if (qty <= 0) delete next[id];
    else next[id] = qty;
    return next;
  });

  const goToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function book(event) {
    event.preventDefault();
    if (!lines.length) { setError('Choose a service first.'); setStatus('error'); return; }

    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/services/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, serviceGroup: group, path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not book the visit.');

      setStatus('done');
      form.reset();
      setPicked({});
      setState('');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (!services.length) return null;

  return (
    <section id="book" className="scroll-mt-39 border-b border-line bg-surface-muted">
      {/* This block sits directly under the header, so it takes less padding
          on top than a mid-page section would. */}
      <div className="df-container pb-12 pt-6 md:pb-16 md:pt-8">
        {/* ------------------------------------------------------------ head */}
        <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="df-eyebrow">Book a visit</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
              Select a service
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Star size={15} className="text-warning" fill="currentColor" strokeWidth={0} aria-hidden="true" />
              <strong className="font-semibold text-ink-900">4.5</strong> · 25 lakh+ bookings
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck size={15} className="text-success" aria-hidden="true" />
              Certified technicians
            </span>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div>
            {/* ---------------------------------------------------- groups */}
            <div className="df-no-scrollbar -mx-4 mb-5 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {groups.map((g) => {
                const n = services.filter((s) => s.group === g.id).length;
                const active = group === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGroup(g.id)}
                    aria-pressed={active}
                    className={cx(
                      'shrink-0 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-all',
                      active
                        ? 'border-primary-500 bg-primary-500 text-white shadow-sm'
                        : 'border-line-strong bg-white text-ink-700 hover:border-primary-300 hover:text-primary-800',
                    )}
                  >
                    {g.label}
                    <span className={cx('ml-1.5 text-[12.5px]', active ? 'text-white/70' : 'text-ink-300')}>
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* -------------------------------------------------- services */}
            <ul className="grid gap-3">
              {visible.map((s) => {
                const qty = picked[s.id] || 0;
                const off = s.mrp > s.price ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;

                return (
                  <li
                    key={s.id}
                    className={cx(
                      'group relative overflow-hidden rounded-2xl border bg-white transition-all',
                      qty
                        ? 'border-primary-500 shadow-[0_0_0_3px_var(--color-primary-100)]'
                        : 'border-line hover:border-primary-200 hover:shadow-[0_10px_28px_-18px_rgb(6_59_76/0.35)]',
                    )}
                  >
                    <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                      <div className="relative hidden h-29 w-29 shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:block">
                        {s.image ? (
                          <Image src={s.image} alt="" fill sizes="116px" className="object-cover" unoptimized />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Wrench size={26} className="text-ink-300" aria-hidden="true" />
                          </span>
                        )}
                        {off ? (
                          <span className="absolute left-0 top-0 rounded-br-lg bg-success px-2 py-0.5 text-[11.5px] font-semibold text-white">
                            {off}% off
                          </span>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-[16.5px] font-semibold leading-snug text-ink-900 md:text-[17px]">
                          {s.name}
                        </h3>

                        {s.points.length ? (
                          <ul className="mt-2 space-y-1">
                            {s.points.slice(0, 4).map((p, i) => (
                              <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-500">
                                <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                                <span className="min-w-0">{p}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                          <span className="flex items-baseline gap-2">
                            <span className="text-[19px] font-semibold text-ink-900">{formatPrice(s.price)}</span>
                            {off ? (
                              <span className="text-[14px] text-ink-300 line-through">{formatPrice(s.mrp)}</span>
                            ) : null}
                          </span>

                          {qty ? (
                            <span className="inline-flex items-center overflow-hidden rounded-xl border border-primary-500">
                              <button
                                type="button"
                                onClick={() => setQty(s.id, qty - 1)}
                                aria-label={`Remove one ${s.name}`}
                                className="px-3 py-2 text-primary-700 transition-colors hover:bg-primary-50"
                              >
                                <Minus size={15} aria-hidden="true" />
                              </button>
                              <span className="min-w-8 text-center text-[14.5px] font-semibold text-primary-800">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(s.id, qty + 1)}
                                aria-label={`Add one ${s.name}`}
                                className="px-3 py-2 text-primary-700 transition-colors hover:bg-primary-50"
                              >
                                <Plus size={15} aria-hidden="true" />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setQty(s.id, 1)}
                              className="rounded-xl bg-primary-500 px-6 py-2.5 text-[14.5px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-900"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ------------------------------------------------------- basket */}
          <aside className="hidden lg:sticky lg:top-34.5 lg:block lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="border-b border-line px-5 py-4">
                <h3 className="text-[16px] font-semibold text-ink-900">Your booking</h3>
              </div>

              {lines.length ? (
                <>
                  <ul className="divide-y divide-line px-5">
                    {lines.map((l) => (
                      <li key={l.id} className="flex items-start justify-between gap-3 py-3.5">
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium leading-snug text-ink-900">{l.name}</span>
                          <span className="mt-0.5 block text-[12.5px] text-ink-400">
                            {formatPrice(l.price)} × {l.qty}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-[14px] text-ink-700">{formatPrice(l.price * l.qty)}</span>
                          <button
                            type="button"
                            onClick={() => setQty(l.id, 0)}
                            aria-label={`Remove ${l.name}`}
                            className="p-1 text-ink-300 transition-colors hover:text-danger"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-line bg-primary-50 px-5 py-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px] font-semibold text-ink-900">Total</span>
                      <span className="text-[19px] font-semibold text-ink-900">{formatPrice(total)}</span>
                    </div>
                    {saved > 0 ? (
                      <p className="mt-1 text-[13px] font-medium text-success">
                        You save {formatPrice(saved)}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[12.5px] leading-snug text-ink-400">
                      Payable after the visit. Spare parts as per the rate card.
                    </p>

                    <Button type="button" onClick={goToForm} full className="mt-4">
                      Continue
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="px-5 py-8 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <Wrench size={19} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[14px] text-ink-400">
                    Add a service to see it here.
                  </p>
                </div>
              )}

              <ul className="space-y-2.5 border-t border-line px-5 py-4 text-[13.5px] text-ink-500">
                {PROMISES.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <ShieldCheck size={15} className="shrink-0 text-success" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* ------------------------------------------------------- details */}
        <div ref={formRef} className="mt-6 scroll-mt-39 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-5 py-4 md:px-6">
            <h3 className="text-[16px] font-semibold text-ink-900">Where should we come?</h3>
            <p className="mt-1 text-[13.5px] text-ink-400">
              Our team calls you to confirm the slot before the visit.
            </p>
          </div>

          <form onSubmit={book} className="p-5 md:p-6">
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Full name" name="name" required placeholder="Your name" autoComplete="name" />
              <Input label="Mobile number" name="mobile" type="tel" required pattern="[0-9]{10}" maxLength={10} placeholder="10 digit mobile number" autoComplete="tel" />
              <Input label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />

              <Input label="House / flat no." name="houseNo" required placeholder="House / flat no." />
              <Input label="Area" name="area" required placeholder="Street, area" />
              <Input label="Nearby landmark" name="nearBy" placeholder="School / shop / place" />

              <Select
                label="State"
                name="state"
                required
                placeholder="Select state"
                options={states}
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Select
                label="City"
                name="city"
                required
                placeholder={state ? 'Select city' : 'Choose a state first'}
                options={cities}
                disabled={!cities.length}
              />
              <Input label="Pin code" name="pincode" required pattern="[0-9]{6}" maxLength={6} placeholder="6 digit pin code" autoComplete="postal-code" />

              <Select
                label="Premises"
                name="premises"
                placeholder="Select"
                options={premises.map((p) => ({ value: p.id, label: p.label }))}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <Button type="submit" size="lg" disabled={status === 'sending' || !lines.length}>
                {status === 'sending' ? 'Booking…' : 'Book visit'}
              </Button>

              {lines.length ? (
                <span className="text-[14.5px] text-ink-500">
                  {count} service{count === 1 ? '' : 's'} ·{' '}
                  <strong className="font-semibold text-ink-900">{formatPrice(total)}</strong>
                </span>
              ) : (
                <span className="text-[13.5px] text-ink-400">Choose a service above first.</span>
              )}
            </div>

            {status !== 'idle' && status !== 'sending' ? (
              <div className="mt-4">
                <FormNote
                  status={status}
                  error={error}
                  doneMessage="Booking received — our service team will call you to confirm the slot."
                />
              </div>
            ) : null}
          </form>
        </div>
      </div>

      {/* ------------------------------------------- mobile summary bar */}
      {lines.length ? (
        <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-ink-400">
                {count} service{count === 1 ? '' : 's'}
                {saved > 0 ? ` · saving ${formatPrice(saved)}` : ''}
              </span>
              <span className="block text-[17px] font-semibold text-ink-900">{formatPrice(total)}</span>
            </span>
            <Button type="button" onClick={goToForm}>
              Continue
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

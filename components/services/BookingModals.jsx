'use client';

// The three things a booking asks for in a panel of its own: which address,
// whether to type a new one, and when the technician should come.
//
// They are modals rather than steps because the booking page is one page now.
// Someone who has booked before touches two of them for a second and is done;
// the long address form is only opened by the people who actually need it.

import { useEffect, useState } from 'react';
import {
  Building2, Check, Loader2, MapPin, Navigation, Phone, Plus, User, X,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/* ------------------------------------------------------------------- shell */

export function Modal({ open, onClose, title, note, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'df-modal-in relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-white shadow-[0_30px_80px_-20px_rgb(6_59_76/0.45)] sm:rounded-3xl',
          wide ? 'sm:max-w-[600px]' : 'sm:max-w-[460px]',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
            {note ? <p className="mt-0.5 text-[13px] text-ink-400">{note}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="df-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- saved addresses */

export function AddressPicker({
  open, onClose, addresses = [], onPick, onAddNew,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Saved addresses" note="Pick where the technician should come.">
      <div className="p-4">
        <button
          type="button"
          onClick={onAddNew}
          className="mb-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary-300 text-[14px] font-medium text-primary-700 transition-colors hover:border-primary-500 hover:bg-primary-50"
        >
          <Plus size={15} aria-hidden="true" />
          Add a new address
        </button>

        {addresses.length ? (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onPick(a)}
                  className="flex w-full items-start gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-primary-400 hover:bg-primary-50/50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <MapPin size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-ink-900">{a.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{a.line}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-line bg-surface-muted px-4 py-6 text-center text-[13.5px] text-ink-400">
            No saved addresses on this number yet — add one above.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ new  address */

const field = 'h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10 disabled:bg-surface-muted';

function Label({ children, required }) {
  return (
    <span className="mb-1 block text-[12.5px] font-medium text-ink-700">
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </span>
  );
}

export function AddressForm({
  open, onClose, onSaved, states = [], mobile = '', name = '',
}) {
  const [form, setForm] = useState({
    type: 'home', name: '', phone: '', altPhone: '', pincode: '', state: '', city: '', houseNo: '', street: '', landmark: '',
  });
  const [cities, setCities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Opened fresh each time, with what the account already knows filled in.
  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, name: f.name || name, phone: f.phone || mobile }));
    setError('');
  }, [open, name, mobile]);

  useEffect(() => {
    if (!form.state) { setCities([]); return; }
    fetch(`/api/services/cities?state=${encodeURIComponent(form.state)}`)
      .then((r) => r.json())
      .then((d) => setCities(d.cities || []))
      .catch(() => setCities([]));
  }, [form.state]);

  /** Six digits is enough to know the city and the state; nobody should type them. */
  async function fillFromPincode(pin) {
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    setLookingUp(true);
    try {
      const data = await (await fetch(`/api/pincode/${pin}`)).json();
      if (data?.ok) {
        setForm((f) => ({ ...f, state: data.state || f.state, city: data.city || f.city }));
      }
    } catch { /* they can still pick both by hand */ } finally {
      setLookingUp(false);
    }
  }

  async function save() {
    setError('');
    for (const [key, label] of [
      ['name', 'name'], ['phone', 'phone number'], ['pincode', 'pin code'],
      ['state', 'state'], ['city', 'city'], ['houseNo', 'house or flat number'], ['street', 'street'],
    ]) {
      if (!String(form[key]).trim()) { setError(`Please enter the ${label}.`); return; }
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { setError('Enter a valid 10-digit phone number.'); return; }
    if (!/^[1-9]\d{5}$/.test(form.pincode)) { setError('Enter a valid 6-digit pin code.'); return; }

    setBusy(true);
    const res = await fetch('/api/services/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);

    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save the address.'); return; }
    onSaved(data.addresses || [], data.chosen || (data.addresses || [])[0]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Address details" note="Where should the technician come?" wide>
      <div className="space-y-3.5 p-5">
        <div>
          <Label>Address type</Label>
          <div className="flex gap-2">
            {[{ id: 'home', label: 'Home', icon: MapPin }, { id: 'office', label: 'Office', icon: Building2 }].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set('type', t.id)}
                className={cx(
                  'inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-[13.5px] font-medium transition-colors',
                  form.type === t.id ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-line text-ink-700 hover:border-primary-300',
                )}
              >
                <t.icon size={15} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <Label required>Name</Label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" className={cx(field, 'pl-9')} />
            </div>
          </label>

          <label className="block">
            <Label required>Phone number</Label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                inputMode="numeric"
                className={cx(field, 'pl-9')}
              />
            </div>
          </label>

          <label className="block">
            <Label>Alternate phone</Label>
            <input
              value={form.altPhone}
              onChange={(e) => set('altPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Optional"
              inputMode="numeric"
              className={field}
            />
          </label>

          <label className="block">
            <Label required>Pin code</Label>
            <div className="relative">
              <input
                value={form.pincode}
                onChange={(e) => {
                  const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
                  set('pincode', pin);
                  if (pin.length === 6) fillFromPincode(pin);
                }}
                placeholder="6-digit pin code"
                inputMode="numeric"
                className={field}
              />
              {lookingUp ? <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary-500" aria-hidden="true" /> : null}
            </div>
            <span className="mt-1 block text-[11.5px] text-ink-400">City and state fill in themselves.</span>
          </label>

          <label className="block">
            <Label required>State</Label>
            <select value={form.state} onChange={(e) => { set('state', e.target.value); set('city', ''); }} className={cx(field, 'bg-white')}>
              <option value="">Select state</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
              {form.state && !states.includes(form.state) ? <option value={form.state}>{form.state}</option> : null}
            </select>
          </label>

          <label className="block">
            <Label required>City</Label>
            <select value={form.city} onChange={(e) => set('city', e.target.value)} disabled={!form.state} className={cx(field, 'bg-white')}>
              <option value="">{form.state ? 'Select city' : 'Choose a state first'}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              {form.city && !cities.includes(form.city) ? <option value={form.city}>{form.city}</option> : null}
            </select>
          </label>

          <label className="block">
            <Label required>House / flat number</Label>
            <input value={form.houseNo} onChange={(e) => set('houseNo', e.target.value)} placeholder="House, flat or building" className={field} />
          </label>

          <label className="block">
            <Label required>Street</Label>
            <input value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="Street, area or sector" className={field} />
          </label>

          <label className="block sm:col-span-2">
            <Label>Landmark</Label>
            <div className="relative">
              <Navigation size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input value={form.landmark} onChange={(e) => set('landmark', e.target.value)} placeholder="Something nearby, so the technician finds you" className={cx(field, 'pl-9')} />
            </div>
          </label>
        </div>

        {error ? <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      </div>

      <div className="flex gap-3 border-t border-line p-4">
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-xl border border-line-strong text-[14.5px] text-ink-700 transition-colors hover:border-primary-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          Save address
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- date & time */

/** Today and the four days after it. */
function nextDays(count = 5) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: days[d.getDay()],
      date: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    };
  });
}

export function SchedulePicker({ open, onClose, onPick }) {
  const [days] = useState(() => nextDays());
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // The slots belong to the day, so they are fetched when one is chosen and
  // the time is cleared: a slot picked for Tuesday is not a slot for Friday.
  useEffect(() => {
    if (!date) { setSlots([]); return undefined; }
    let live = true;
    setLoading(true);
    setSlot(null);
    fetch(`/api/services/timeslots?date=${encodeURIComponent(date.value)}`)
      .then((r) => r.json())
      .then((d) => { if (live) setSlots(d.slots || []); })
      .catch(() => { if (live) setSlots([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [date]);

  return (
    <Modal open={open} onClose={onClose} title="When should the technician arrive?" note="Pick a day, then a time window.">
      <div className="p-5">
        <div className="grid grid-cols-5 gap-2">
          {days.map((d, i) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDate(d)}
              className={cx(
                'rounded-xl border px-1 py-2.5 text-center transition-colors',
                date?.value === d.value ? 'border-primary-600 bg-primary-600 text-white' : 'border-line text-ink-700 hover:border-primary-300',
              )}
            >
              <span className={cx('block text-[11px] leading-tight', date?.value === d.value ? 'text-white/80' : 'text-ink-400')}>
                {i === 0 ? 'Today' : d.day}
              </span>
              <span className="mt-0.5 block text-[16px] font-semibold leading-tight">{d.date}</span>
              <span className={cx('block text-[10.5px] leading-tight', date?.value === d.value ? 'text-white/80' : 'text-ink-400')}>
                {d.month}
              </span>
            </button>
          ))}
        </div>

        {date ? (
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium text-ink-700">Start time</p>

            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[0, 1, 2, 3].map((i) => <span key={i} className="h-11 animate-pulse rounded-xl bg-surface-muted" />)}
              </div>
            ) : slots.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={cx(
                      'h-11 rounded-xl border px-2 text-[12.5px] font-medium transition-colors',
                      slot === s ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-line text-ink-700 hover:border-primary-300',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-line bg-surface-muted px-4 py-6 text-center text-[13.5px] text-ink-400">
                That day is fully booked — please try another.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-4">
        <button
          type="button"
          disabled={!date || !slot}
          onClick={() => onPick({ date: date.value, slot, label: `${date.day}, ${date.month} ${date.date} · ${slot}` })}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-400"
        >
          <Check size={16} aria-hidden="true" />
          Confirm this time
        </button>
      </div>
    </Modal>
  );
}

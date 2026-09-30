'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BadgeCheck, CalendarClock, Check, ChevronRight, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck,
  Trash2, User, Wallet, Wrench,
} from 'lucide-react';
import { useServiceCart } from '@/lib/service-cart';
import { readAddresses, writeAddresses } from '@/lib/service-addresses';
import { markPendingBooking } from '@/lib/pending-booking';
import { AddressForm, AddressPicker, SchedulePicker } from './BookingModals';
import { formatPrice, cx } from '@/lib/utils';

/**
 * Booking the visit — one page, four things to settle.
 *
 * It was four screens; it is one now. Someone who has booked before has an
 * address and a number on file, so the whole booking is two taps and the only
 * real question is when. The bar at the top ticks off what is settled, and the
 * two questions that need room — which address, and what time — open in a
 * panel instead of pushing everything else off the screen.
 */
const STEPS = ['Details', 'Address', 'Schedule', 'Payment'];

const ASSURANCES = [
  { icon: ShieldCheck, label: 'Secure' },
  { icon: CalendarClock, label: 'Flexible timing' },
  { icon: BadgeCheck, label: 'Verified pros' },
];

function Bar({ at }) {
  return (
    <ol className="mb-5 flex items-start">
      {STEPS.map((label, i) => {
        const done = i < at;
        const now = i === at;
        return (
          <li key={label} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <span className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <span
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-[13px] font-semibold transition-colors',
                  done && 'border-success bg-success text-white',
                  now && 'border-primary-600 bg-white text-primary-700 ring-4 ring-primary-100',
                  !done && !now && 'border-line bg-white text-ink-300',
                )}
              >
                {done ? <Check size={16} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx('text-[12px] leading-none', now ? 'font-semibold text-ink-900' : 'text-ink-400')}>
                {label}
              </span>
            </span>
            {i < STEPS.length - 1 ? (
              <span className={cx('mt-[18px] h-0.5 flex-1 rounded-full', done ? 'bg-success' : 'bg-line')} aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Card({
  title, icon: Icon, done, action, children, muted = false,
}) {
  return (
    <section className={cx('overflow-hidden rounded-2xl border border-line', muted ? 'bg-surface-muted' : 'bg-white')}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className={cx('flex items-center gap-2 text-[14.5px] font-semibold', muted ? 'text-ink-400' : 'text-ink-900')}>
          {Icon ? <Icon size={16} className={muted ? 'text-ink-300' : 'text-primary-700'} aria-hidden="true" /> : null}
          {title}
          {done ? <Check size={15} className="text-success" aria-hidden="true" /> : null}
        </h2>
        {action}
      </header>
      {children}
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

export default function ServiceCheckout({ states = [], premises = [], canPayOnline = false }) {
  // Whether a payment can be taken for this particular customer: the gateway
  // settings say one thing, the service system's own payment page another.
  const [payOnline, setPayOnline] = useState({ online: canPayOnline, reason: '' });
  const router = useRouter();
  const [lines, cart] = useServiceCart();

  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(null);
  const [when, setWhen] = useState(null); // { date, slot, label }

  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [error, setError] = useState('');

  // Who is booking, and every address we already know for their number —
  // from the sign-in, from visits they have booked, from orders we delivered.
  useEffect(() => {
    setAddresses(readAddresses());

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.replace('/book'); return; }
        setUser(d.user);
      })
      .catch(() => {});

    fetch('/api/services/payment-options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setPayOnline({ online: Boolean(d.online), reason: d.reason || '' }); })
      .catch(() => { /* whatever the page was built with stands */ });

    fetch('/api/services/address', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.addresses?.length) return;
        setAddresses(d.addresses);
        writeAddresses(d.addresses);
      })
      .catch(() => { /* the browser's own copy stands */ });
  }, [router]);

  if (cart.ready && !lines.length && status !== 'sending') {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
        <p className="text-[16px] font-semibold text-ink-900">Your cart is empty</p>
        <Link href="/water-purifier-service" className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary-600 px-5 text-[14.5px] font-medium text-white">
          Browse services
        </Link>
      </div>
    );
  }

  const step = !address ? 1 : !when ? 2 : 3;

  function keepAddresses(list, chosen) {
    setAddresses(list);
    writeAddresses(list);
    if (chosen) setAddress(chosen);
  }

  async function book(payment) {
    if (!address || !when) return;
    setStatus('sending');
    setError('');


    const res = await fetch('/api/services/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: address.label && address.label !== 'Saved address' ? address.label : (user?.name || ''),
        mobile: user?.mobile || '',
        email: user?.email || '',
        houseNo: address.houseNo || address.line,
        area: address.street || '',
        nearBy: address.landmark || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
        // The service's own id for this address, when it has one: a booking
        // filed there is filed against the address, not against its words.
        addressId: address.remoteId || '',
        premises: premises[0]?.id || '',
        date: when.date,
        slot: when.slot,
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

    cart.clear();

    // Straight to the payment page. The booking is written here first and
    // sits as unpaid until the money arrives, so leaving the payment page
    // loses nothing but does not pretend to be a confirmed booking either.
    if (data.redirect) {
      // Where to come back to: the gateway's own "cancelled" page has no way
      // back to here, so this site brings them back itself.
      markPendingBooking(data.ref);
      window.location.href = data.redirect;
      return;
    }

    window.location.href = `/book/done?ref=${encodeURIComponent(data.ref || '')}`;
  }

  const sending = status === 'sending';

  return (
    <>
      <Bar at={step} />

      <div className="space-y-4">
        {/* ------------------------------------------------------- the basket */}
        <Card title={`Services (${lines.length})`} icon={Wrench} done>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-muted">
                  {l.image
                    ? <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
                    : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Wrench size={16} className="text-ink-300" aria-hidden="true" />
                      </span>
                    )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium leading-snug text-ink-900">{l.name}</span>
                  <span className="mt-1.5 inline-flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg border border-line-strong">
                      <button type="button" onClick={() => cart.setQty(l, l.qty - 1)} aria-label="One fewer" className="px-2 py-1 text-ink-500 hover:text-primary-700">
                        <Minus size={13} aria-hidden="true" />
                      </button>
                      <span className="min-w-7 text-center text-[13.5px]">{l.qty}</span>
                      <button type="button" onClick={() => cart.setQty(l, l.qty + 1)} aria-label="One more" className="px-2 py-1 text-ink-500 hover:text-primary-700">
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </span>
                    <button type="button" onClick={() => cart.remove(l.id)} aria-label={`Remove ${l.name}`} className="rounded p-1.5 text-ink-300 hover:text-danger">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </span>
                </span>

                <span className="shrink-0 text-[14.5px] font-semibold text-ink-900">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>

          <p className="flex items-center justify-between border-t border-line px-5 py-3.5">
            <span className="text-[15px] font-medium text-ink-900">Total</span>
            <span className="text-[18px] font-semibold text-primary-800">{formatPrice(cart.total)}</span>
          </p>
        </Card>

        {/* ------------------------------------------------------- who books */}
        <Card title="Customer details" icon={User} done={Boolean(user)}>
          <dl className="space-y-1.5 px-5 py-4 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Name</dt>
              <dd className="text-right text-ink-900">{user?.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Phone</dt>
              <dd className="text-right text-ink-900">{user?.mobile ? `+91 ${user.mobile}` : '—'}</dd>
            </div>
            {user?.email ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Email</dt>
                <dd className="text-right text-ink-900">{user.email}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {/* --------------------------------------------------------- address */}
        <Card
          title="Service address"
          icon={MapPin}
          done={Boolean(address)}
          action={address ? <Change onClick={() => setPicking(true)} /> : null}
        >
          <div className="p-4">
            {address ? (
              <p className="px-1 text-[14px] leading-relaxed text-ink-700">
                <span className="block font-medium text-ink-900">{address.label}</span>
                {address.line}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <MapPin size={16} aria-hidden="true" />
                Select address
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </Card>

        {/* -------------------------------------------------------- the time */}
        <Card
          title="Appointment time"
          icon={CalendarClock}
          done={Boolean(when)}
          muted={!address}
          action={when ? <Change onClick={() => setScheduling(true)} /> : null}
        >
          <div className="p-4">
            {when ? (
              <p className="px-1 text-[14px] text-ink-700">{when.label}</p>
            ) : (
              <button
                type="button"
                disabled={!address}
                onClick={() => setScheduling(true)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-400"
              >
                <Clock size={16} aria-hidden="true" />
                Select date &amp; time
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------- the money */}
        <Card title="Payment options" icon={Wallet} muted={!when}>
          <div className="space-y-2.5 p-4">
            <button
              type="button"
              disabled={!when || sending || !payOnline.online}
              onClick={() => book('online')}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-400"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              {payOnline.online ? `Pay ${formatPrice(cart.total)} now` : 'Pay online (unavailable)'}
              {payOnline.online ? <ChevronRight size={16} aria-hidden="true" /> : null}
            </button>

            <button
              type="button"
              disabled={!when || sending}
              onClick={() => book('after')}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-white text-[15px] font-medium text-ink-800 transition-colors hover:border-primary-400 hover:text-primary-800 disabled:cursor-not-allowed disabled:border-line disabled:text-ink-300"
            >
              {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />}
              Pay after service
            </button>

            <p className="pt-1 text-center text-[12.5px] text-ink-400">
              {payOnline.online
                ? 'Paying now is optional — the technician takes cash, UPI or card after the visit either way.'
                : payOnline.reason === 'not-signed-in-with-otp'
                  ? 'Paying online needs a fresh sign-in with an OTP — or pay the technician after the visit.'
                  : 'Online payment is not available for this booking; the technician takes cash, UPI or card after the visit.'}
            </p>
          </div>
        </Card>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13.5px] text-danger">{error}</p>
        ) : null}

        {/* ---------------------------------------------------- reassurances */}
        <ul className="grid grid-cols-3 gap-3">
          {ASSURANCES.map(({ icon: Icon, label }) => (
            <li key={label} className="rounded-xl border border-line bg-white px-2 py-3 text-center">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="mt-1.5 block text-[12px] text-ink-500">{label}</span>
            </li>
          ))}
        </ul>

        <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink-600">
          <span className="font-semibold text-ink-900">Cancellation policy — </span>
          free if you cancel more than 12 hours before the visit, or if no technician has been assigned yet.
          A fee applies otherwise.
        </p>
      </div>

      <AddressPicker
        open={picking}
        onClose={() => setPicking(false)}
        addresses={addresses}
        onPick={(a) => { setAddress(a); setPicking(false); }}
        onAddNew={() => { setPicking(false); setAdding(true); }}
      />

      <AddressForm
        open={adding}
        onClose={() => setAdding(false)}
        states={states}
        mobile={user?.mobile || ''}
        name={user?.name || ''}
        onSaved={(list, chosen) => { keepAddresses(list, chosen); setAdding(false); }}
      />

      <SchedulePicker
        open={scheduling}
        onClose={() => setScheduling(false)}
        onPick={(picked) => { setWhen(picked); setScheduling(false); }}
      />
    </>
  );
}

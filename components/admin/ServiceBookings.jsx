'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Phone, MapPin, CalendarClock, Wallet, Loader2, Wrench, Trash2,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { formatPrice, cx } from '@/lib/utils';

/**
 * Service visits booked on the website.
 *
 * The visit itself is dispatched by the RO Care service system; this is the
 * record of what was booked here — who, where, when, what it costs and whether
 * it was paid online or is to be paid to the technician.
 */
const STATUS = [
  { id: 'new', label: 'New' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
];

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');

function Stat({ label, value, tone = 'plain' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[13px] text-ink-400">{label}</p>
      <p className={cx('mt-0.5 text-[22px] font-semibold', tone === 'good' ? 'text-success' : 'text-ink-900')}>{value}</p>
    </div>
  );
}

export default function ServiceBookings({ bookings }) {
  const router = useRouter();
  const allow = useCan();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (tab !== 'all' && b.status !== tab) return false;
      if (!q) return true;
      return `${b.ref} ${b.name} ${b.mobile} ${b.address} ${b.services.map((s) => s.name).join(' ')}`
        .toLowerCase().includes(q);
    });
  }, [bookings, query, tab]);

  const paidTotal = bookings.filter((b) => b.paymentStatus === 'paid').reduce((n, b) => n + b.amount, 0);

  async function remove(booking) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete booking ${booking.ref} from ${booking.name || 'this customer'}?

It is removed from this list only — the service team's own record stays as it is.`)) return;

    setBusy(booking.id);
    setError('');
    const res = await fetch('/api/admin/service-bookings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(0);
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not delete the booking.'); return; }
    router.refresh();
  }

  async function setStatus(id, status) {
    setBusy(id);
    setError('');
    const res = await fetch('/api/admin/service-bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(0);
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save the change.'); return; }
    router.refresh();
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-ink-900">Service bookings</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-400">Visits booked on the website.</p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total bookings" value={bookings.length} />
        <Stat label="New" value={bookings.filter((b) => b.status === 'new').length} />
        <Stat label="Paid online" value={bookings.filter((b) => b.paymentStatus === 'paid').length} tone="good" />
        <Stat label="Collected online" value={formatPrice(paidTotal)} tone="good" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
        <span className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, number, address or booking id…"
            className="h-10 w-full rounded-lg border border-line-strong pl-9 pr-3 text-[14px] outline-none focus:border-primary-500"
          />
        </span>
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          aria-label="Status"
          className="h-10 rounded-lg border border-line-strong bg-white px-3 text-[14px] text-ink-700 outline-none focus:border-primary-500"
        >
          <option value="all">All status</option>
          {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {error ? <p className="mb-3 text-[13.5px] text-danger">{error}</p> : null}

      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((b) => (
            <li key={b.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink-900">{b.name || 'Customer'}</span>
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[11.5px] font-medium text-ink-500">{b.ref}</span>
                    <span
                      className={cx(
                        'rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
                        b.paymentStatus === 'paid' ? 'bg-success/10 text-success'
                          : b.paymentStatus === 'failed' ? 'bg-danger/10 text-danger'
                            : 'bg-warning/10 text-warning',
                      )}
                    >
                      {b.paymentStatus === 'paid' ? 'Paid online' : b.paymentStatus === 'failed' ? 'Payment failed' : 'Pay after service'}
                    </span>
                  </p>

                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} aria-hidden="true" />
                      <a href={`tel:+91${b.mobile}`} className="text-primary-700 hover:text-primary-800">{`+91 ${b.mobile}`}</a>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={13} aria-hidden="true" />
                      {[b.date, b.slot].filter(Boolean).join(', ') || 'No slot chosen'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet size={13} aria-hidden="true" />
                      {formatPrice(b.amount)}
                    </span>
                  </p>

                  <p className="mt-1 flex items-start gap-1.5 text-[13.5px] text-ink-500">
                    <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {b.address || '—'}
                  </p>

                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {b.services.length ? b.services.map((s) => (
                      <span key={`${b.id}-${s.id || s.name}`} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[12.5px] text-primary-800">
                        <Wrench size={11} aria-hidden="true" />
                        {`${s.name}${s.qty > 1 ? ` × ${s.qty}` : ''}`}
                      </span>
                    )) : <span className="text-[13px] text-ink-400">No services listed</span>}
                  </p>

                  <p className="mt-2 text-[12.5px] text-ink-400">
                    {`Booked ${when(b.at)}${b.remoteRef ? ` · service system ref ${b.remoteRef}` : ' · not yet in the service system'}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {allow('service_bookings', 'edit') ? (
                    <select
                      value={b.status}
                      onChange={(e) => setStatus(b.id, e.target.value)}
                      disabled={busy === b.id}
                      aria-label={`Status of ${b.ref}`}
                      className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-[13.5px] text-ink-700 outline-none focus:border-primary-500 disabled:opacity-50"
                    >
                      {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-[13px] text-ink-500">{STATUS.find((s) => s.id === b.status)?.label || b.status}</span>
                  )}
                  {allow('service_bookings', 'delete') ? (
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      disabled={busy === b.id}
                      title="Delete this booking"
                      aria-label={`Delete booking ${b.ref}`}
                      className="rounded-lg border border-danger/30 p-2 text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                  {busy === b.id ? <Loader2 size={15} className="animate-spin text-ink-400" aria-hidden="true" /> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-[14px] text-ink-400">
          {bookings.length ? 'No booking matches that.' : 'No service bookings yet.'}
        </p>
      )}
    </>
  );
}

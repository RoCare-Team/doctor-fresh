import Link from 'next/link';
import {
  Check, Phone, CalendarClock, MapPin, Wallet, PhoneCall, Wrench, ShieldCheck,
} from 'lucide-react';
import { getBookingByRef } from '@/lib/sql/service-bookings';
import { formatPrice, metaFor } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = {
  ...metaFor({ title: 'Booking confirmed', description: 'Your service visit is booked.', path: '/book/done' }),
  robots: { index: false, follow: false },
};

/** A stored date as someone would say it: "Mon, 28 Sept 2026". */
function niceDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** What happens after the booking, so nobody is left wondering. */
const NEXT = [
  { icon: PhoneCall, title: 'We call you', note: 'Our team confirms the time slot on your number.' },
  { icon: Wrench, title: 'A technician arrives', note: 'Trained, with the parts for the job.' },
  { icon: ShieldCheck, title: 'You pay after', note: 'Cash, UPI or card once the work is done.' },
];

function Line({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 px-5 py-3.5">
      <Icon size={17} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[12.5px] uppercase tracking-wide text-ink-400">{label}</p>
        <div className="mt-0.5 text-[14.5px] text-ink-900">{children}</div>
      </div>
    </div>
  );
}

export default async function BookingDonePage({ searchParams }) {
  const { ref } = await searchParams;
  const booking = ref ? await getBookingByRef(ref).catch(() => null) : null;
  const paid = booking?.paymentStatus === 'paid';

  // The address is stored as its parts; shown as an address, not one long line.
  const street = [booking?.houseNo, booking?.area].filter(Boolean).join(', ');
  const town = [booking?.city, booking?.state].filter(Boolean).join(', ');

  return (
    <div className="df-container df-section max-w-xl">
      <div className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
            <Check size={28} strokeWidth={3} aria-hidden="true" />
          </span>
        </span>

        <h1 className="mt-5 text-[26px] font-semibold text-ink-900">Booking confirmed</h1>
        <p className="mt-1.5 text-[15px] text-ink-500">
          {booking?.mobile
            ? `Our team will call you on +91 ${booking.mobile} to confirm the time.`
            : 'Our team will call you to confirm the time.'}
        </p>

        {booking ? (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-ink-700">
              {`Booking ${booking.ref}`}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                paid ? 'bg-success/10 text-success' : 'bg-primary-50 text-primary-800'
              }`}
            >
              {paid ? 'Paid online' : 'Pay after the visit'}
            </span>
          </p>
        ) : null}
      </div>

      {booking ? (
        <>
          <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
            <h2 className="border-b border-line bg-surface-muted px-5 py-3 text-[14px] font-semibold text-ink-900">
              What we are coming for
            </h2>

            <ul className="divide-y divide-line">
              {booking.services.map((s) => (
                <li key={`${s.id || s.name}`} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-[14.5px] text-ink-900">
                    {s.name}
                    {s.qty > 1 ? <span className="text-ink-400">{` × ${s.qty}`}</span> : null}
                  </span>
                  <span className="text-[14.5px] font-medium text-ink-700">
                    {formatPrice((Number(s.price) || 0) * (Number(s.qty) || 1))}
                  </span>
                </li>
              ))}
            </ul>

            <p className="flex items-center justify-between border-t border-line px-5 py-3.5">
              <span className="text-[15px] text-ink-700">Total</span>
              <span className="text-[19px] font-semibold text-primary-800">{formatPrice(booking.amount)}</span>
            </p>
          </section>

          <section className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            <Line icon={CalendarClock} label="Visit">
              {[niceDate(booking.date), booking.slot].filter(Boolean).join('  ·  ') || 'Our team will confirm a slot'}
            </Line>

            <Line icon={MapPin} label="Address">
              {street ? <span className="block">{street}</span> : null}
              {town ? <span className="block">{town}</span> : null}
              {booking.pincode ? <span className="block text-ink-500">{booking.pincode}</span> : null}
            </Line>

            <Line icon={Wallet} label="Payment">
              {paid ? 'Paid online' : 'Pay the technician after the visit — cash, UPI or card'}
            </Line>
          </section>

          <section className="mt-4 rounded-2xl border border-line bg-white p-5">
            <h2 className="text-[14px] font-semibold text-ink-900">What happens next</h2>
            <ol className="mt-3 space-y-3">
              {NEXT.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12.5px] font-semibold text-primary-800">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-ink-900">
                      <step.icon size={14} className="text-primary-700" aria-hidden="true" />
                      {step.title}
                    </span>
                    <span className="block text-[13.5px] text-ink-400">{step.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-primary-600 px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-primary-700"
        >
          Back to home
        </Link>
        <Link
          href="/water-purifier-service"
          className="inline-flex h-11 items-center rounded-xl border border-line-strong px-5 text-[14.5px] text-ink-700 transition-colors hover:border-primary-300"
        >
          Book another service
        </Link>
        <a
          href="tel:+919311587716"
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-strong px-5 text-[14.5px] text-ink-700 transition-colors hover:border-primary-300"
        >
          <Phone size={15} aria-hidden="true" />
          +91-9311587716
        </a>
      </div>

      <p className="mt-4 text-center text-[13px] text-ink-400">
        Need to change something? Call us and quote your booking number.
      </p>
    </div>
  );
}

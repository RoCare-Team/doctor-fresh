'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Home, Briefcase, Loader2, LocateFixed, MapPin, ChevronDown,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * The delivery step: one form, always open. Name and mobile arrive filled from
 * the account, the pin code (typed, or found from the phone's location) fills
 * the city and state, and landmark, email and a delivery note wait behind
 * "optional".
 *
 * It holds no state of its own beyond the lookup; the checkout owns the
 * address, so it can submit and validate it.
 */
export default function AddressStep({ draft, onDraft, errors }) {
  return <NewAddressForm draft={draft} onDraft={onDraft} errors={errors} />;
}

const TYPES = [
  { id: 'Home', icon: Home },
  { id: 'Work', icon: Briefcase },
];

function NewAddressForm({ draft, onDraft, errors }) {
  const [lookup, setLookup] = useState({ status: 'idle', areas: [] });
  const [locating, setLocating] = useState({ status: 'idle', message: '' });
  const [showMore, setShowMore] = useState(Boolean(draft.near_by || draft.message));
  // City and state last filled from a pin code, so a later pin code may
  // replace them — but never something the customer typed themselves.
  const autoFilled = useRef({ city: '', state: '' });

  const set = (field) => (event) => onDraft({ [field]: event.target.value }, true);

  useEffect(() => {
    const pin = String(draft.c_pincode || '');
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setLookup({ status: 'idle', areas: [] });
      return undefined;
    }

    const controller = new AbortController();
    setLookup((l) => ({ ...l, status: 'loading' }));

    fetch(`/api/pincode/${pin}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setLookup({ status: 'missing', areas: [] });
          return;
        }
        setLookup({ status: 'found', areas: data.areas || [], city: data.city, state: data.state });

        const patch = {};
        if (!draft.city || draft.city === autoFilled.current.city) patch.city = data.city;
        if (!draft.state || draft.state === autoFilled.current.state) patch.state = data.state;
        autoFilled.current = { city: data.city, state: data.state };
        if (Object.keys(patch).length) onDraft(patch);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ status: 'missing', areas: [] });
      });

    return () => controller.abort();
    // Only a new pin code should trigger a lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.c_pincode]);

  /**
   * "Use my location": the browser gives the coordinates, our own route turns
   * them into a pin code, and the pin code lookup above fills in the rest. The
   * street line is only ever a suggestion — the customer still confirms it.
   */
  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocating({ status: 'error', message: 'This browser cannot share your location — please type your pin code.' });
      return;
    }

    setLocating({ status: 'loading', message: '' });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/geo/reverse?lat=${coords.latitude}&lon=${coords.longitude}`);
          const data = await res.json();
          if (!data.ok || !data.pincode) {
            setLocating({ status: 'error', message: 'Could not read a pin code for that spot — please type it.' });
            return;
          }

          const patch = { c_pincode: data.pincode };
          if (data.area && !draft.area) patch.area = data.area;
          onDraft(patch, true);
          setLocating({ status: 'done', message: '' });
        } catch {
          setLocating({ status: 'error', message: 'Could not find your location right now — please type your pin code.' });
        }
      },
      (err) => {
        setLocating({
          status: 'error',
          message: err.code === err.PERMISSION_DENIED
            ? 'Location permission is off — allow it in your browser, or type your pin code.'
            : 'Could not get your location — please type your pin code.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  }

  const pinHint = {
    loading: (
      <span className="inline-flex items-center gap-1 text-ink-400">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        Finding your area…
      </span>
    ),
    found: (
      <span className="inline-flex items-center gap-1 text-success">
        <MapPin size={12} aria-hidden="true" />
        {`${lookup.city}, ${lookup.state}`}
      </span>
    ),
    missing: <span className="text-ink-400">Enter the city and state below</span>,
  }[lookup.status];

  return (
    <div>
      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          <input name="name" value={draft.name} onChange={set('name')} autoComplete="name" placeholder=" " />
        </Field>

        <Field label="Mobile number" required error={errors.mobile} prefix="+91">
          <input
            name="mobile"
            value={draft.mobile}
            onChange={(e) => onDraft({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }, true)}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder=" "
          />
        </Field>

        {/* The pin code drives the city, the state and the area suggestions, so
            it sits beside the one-tap way of filling it. */}
        <Field label="Pin code" required error={errors.c_pincode} hint={pinHint}>
          <input
            name="c_pincode"
            value={draft.c_pincode}
            onChange={(e) => onDraft({ c_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }, true)}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder=" "
          />
        </Field>

        <div className="self-start">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating.status === 'loading'}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary-500 bg-primary-50/60 px-4 text-[14.5px] font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-60"
          >
            {locating.status === 'loading'
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <LocateFixed size={16} aria-hidden="true" />}
            {locating.status === 'loading' ? 'Finding you…' : 'Use my location'}
          </button>
          <p aria-live="polite" className="mt-1 text-[12.5px]">
            {locating.status === 'error' ? <span className="text-danger">{locating.message}</span> : null}
            {locating.status === 'idle' ? <span className="text-ink-400">Fills the pin code for you</span> : null}
          </p>
        </div>

        <Field label="City" required error={errors.city}>
          <input name="city" value={draft.city} onChange={set('city')} autoComplete="address-level2" placeholder=" " />
        </Field>

        <Field label="State" required error={errors.state}>
          <input name="state" value={draft.state} onChange={set('state')} autoComplete="address-level1" placeholder=" " />
        </Field>

        <Field label="House no., building name" required error={errors.house_no} className="sm:col-span-2">
          <input name="house_no" value={draft.house_no} onChange={set('house_no')} autoComplete="address-line1" placeholder=" " />
        </Field>

        <Field label="Road name, area, colony" required error={errors.area} className="sm:col-span-2">
          <input
            name="area"
            value={draft.area}
            onChange={set('area')}
            autoComplete="address-line2"
            placeholder=" "
            list="checkout-areas"
          />
          {/* Localities for the pin code, offered as the customer types. */}
          <datalist id="checkout-areas">
            {lookup.areas.map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-medium text-primary-700 hover:text-primary-800"
      >
        <ChevronDown size={15} aria-hidden="true" className={cx('transition-transform', showMore && 'rotate-180')} />
        {showMore ? 'Hide optional details' : 'Add landmark, email or delivery note (optional)'}
      </button>

      {showMore ? (
        <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-2">
          <Field label="Nearby landmark">
            <input name="near_by" value={draft.near_by} onChange={set('near_by')} placeholder=" " />
          </Field>
          <Field label="Email for the invoice" error={errors.email}>
            <input name="email" type="email" value={draft.email} onChange={set('email')} autoComplete="email" placeholder=" " />
          </Field>
          <Field label="Delivery note" className="sm:col-span-2">
            <input name="message" value={draft.message} onChange={set('message')} placeholder=" " />
          </Field>
        </div>
      ) : null}

      {/* Where to deliver — a house at midday and an office after six are two
          different delivery windows for the technician. */}
      <fieldset className="mt-4">
        <legend className="mb-2 text-[13px] font-medium text-ink-700">Type of address</legend>
        <div className="flex gap-2">
          {TYPES.map(({ id, icon: Icon }) => {
            const on = (draft.address_type || 'Home') === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onDraft({ address_type: id }, true)}
                aria-pressed={on}
                className={cx(
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors',
                  on
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-line-strong text-ink-500 hover:border-primary-300',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {id}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/**
 * One field: a 48px box with the label riding on its border once there is
 * something in it. The label doubles as the placeholder while the box is
 * empty, which is why every input is given `placeholder=" "`.
 */
function Field({
  label, required, error, hint, prefix, className, children,
}) {
  return (
    <label className={cx('block', className)}>
      <span
        className={cx(
          'group relative block rounded-xl border bg-white transition-colors',
          '[&_input]:h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:bg-transparent [&_input]:px-3.5 [&_input]:pt-4 [&_input]:text-[15px] [&_input]:text-ink-900 [&_input]:outline-none',
          prefix && '[&_input]:pl-12',
          error ? 'border-danger' : 'border-line-strong focus-within:border-primary-500',
        )}
      >
        {prefix ? (
          <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[15px] text-ink-500">{prefix}</span>
        ) : null}

        {children}

        {/* The label doubles as the placeholder while the box is empty, and
            lifts into the top of the box on focus or once something is typed. */}
        <span
          className={cx(
            'pointer-events-none absolute left-3.5 top-1.5 text-[11.5px] font-medium text-ink-400 transition-all duration-150',
            // empty and untouched — sit where the text will go
            !prefix && 'group-has-[input:placeholder-shown]:top-1/2 group-has-[input:placeholder-shown]:-translate-y-1/2 group-has-[input:placeholder-shown]:text-[15px] group-has-[input:placeholder-shown]:font-normal group-has-[input:placeholder-shown]:text-ink-300',
            // focused — always up, and in the accent colour
            'group-focus-within:top-1.5 group-focus-within:translate-y-0 group-focus-within:text-[11.5px] group-focus-within:font-medium group-focus-within:text-primary-700',
          )}
        >
          {label}
          {required ? <span className="text-danger">{' *'}</span> : null}
        </span>
      </span>

      {error ? (
        <span className="mt-1 block text-[12.5px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12.5px]">{hint}</span>
      ) : null}
    </label>
  );
}

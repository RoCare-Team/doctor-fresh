'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check, Home, Loader2, MapPin, Plus, ChevronDown,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * The delivery step, shaped the way shops ask for an address:
 *
 *  - a returning customer picks one of the addresses their orders already went
 *    to, and is done;
 *  - a new address asks only for what cannot be worked out — name and mobile
 *    arrive filled from the account, the pin code fills the city and state,
 *    and landmark, email and a delivery note wait behind "optional".
 *
 * It holds no state of its own beyond the lookup; the checkout owns the
 * address, so it can submit and validate it.
 */
export default function AddressStep({
  addresses, choice, onChoose, draft, onDraft, errors,
}) {
  const hasSaved = addresses.length > 0;
  const addingNew = choice === 'new' || !hasSaved;

  return (
    <div className="space-y-4">
      {hasSaved ? (
        <div>
          <p className="mb-2 text-[13.5px] font-medium text-ink-700">Deliver to a saved address</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {addresses.map((a, i) => (
              <SavedCard key={`${a.house_no}-${a.c_pincode}-${i}`} address={a} selected={choice === i} onSelect={() => onChoose(i)} />
            ))}

            <button
              type="button"
              onClick={() => onChoose('new')}
              className={cx(
                'flex min-h-24 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-[14.5px] font-medium transition-colors',
                addingNew
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-line-strong text-ink-500 hover:border-primary-300 hover:text-primary-700',
              )}
            >
              <Plus size={17} aria-hidden="true" />
              Add a new address
            </button>
          </div>
        </div>
      ) : null}

      {addingNew ? <NewAddressForm draft={draft} onDraft={onDraft} errors={errors} withHeading={hasSaved} /> : null}
    </div>
  );
}

function SavedCard({ address: a, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'relative flex gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors',
        selected
          ? 'border-primary-500 bg-primary-50/60 shadow-[0_0_0_3px_var(--color-primary-100)]'
          : 'border-line hover:border-line-strong',
      )}
    >
      <span
        className={cx(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong',
        )}
      >
        {selected ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
      </span>
      <span className="min-w-0 text-[13.5px] leading-snug text-ink-600">
        <span className="flex items-center gap-1.5 text-[14.5px] font-semibold text-ink-900">
          <Home size={13} aria-hidden="true" className="text-ink-400" />
          {a.name || 'Saved address'}
        </span>
        <span className="mt-1 block line-clamp-2">
          {[a.house_no, a.area].filter(Boolean).join(', ')}
        </span>
        <span className="block">{[a.city, a.state].filter(Boolean).join(', ')} – {a.c_pincode}</span>
        {a.mobile ? <span className="mt-0.5 block text-ink-400">+91 {a.mobile}</span> : null}
      </span>
    </button>
  );
}

function NewAddressForm({ draft, onDraft, errors, withHeading }) {
  const [lookup, setLookup] = useState({ status: 'idle', areas: [] });
  const [showMore, setShowMore] = useState(Boolean(draft.near_by || draft.message));
  // City and state last filled from a pin code, so a later pin code may
  // replace them — but never something the customer typed themselves.
  const autoFilled = useRef({ city: '', state: '' });

  const set = (field) => (event) => onDraft({ [field]: event.target.value });

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
      {withHeading ? <p className="mb-2 text-[13.5px] font-medium text-ink-700">New address</p> : null}

      <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Full name" error={errors.name} className="lg:col-span-2">
          <input name="name" value={draft.name} onChange={set('name')} autoComplete="name" placeholder="Full name" />
        </Field>

        <Field label="Mobile number" error={errors.mobile} className="lg:col-span-2">
          <div className="flex">
            <span className="flex items-center rounded-l-md border border-r-0 border-line-strong bg-surface-muted px-2.5 text-[14px] text-ink-500">+91</span>
            <input
              name="mobile"
              value={draft.mobile}
              onChange={(e) => onDraft({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10 digit number"
              className="rounded-l-none"
            />
          </div>
        </Field>

        <Field label="Pin code" error={errors.c_pincode} hint={pinHint} className="sm:col-span-2 lg:col-span-2">
          <input
            name="c_pincode"
            value={draft.c_pincode}
            onChange={(e) => onDraft({ c_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="6 digit pin code"
          />
        </Field>

        <Field label="House / flat / building" error={errors.house_no} className="sm:col-span-2 lg:col-span-3">
          <input name="house_no" value={draft.house_no} onChange={set('house_no')} autoComplete="address-line1" placeholder="e.g. Flat 204, Tower B" />
        </Field>

        <Field label="Area / road / locality" error={errors.area} className="sm:col-span-2 lg:col-span-3">
          <input
            name="area"
            value={draft.area}
            onChange={set('area')}
            autoComplete="address-line2"
            placeholder={lookup.areas.length ? 'Type or pick your area' : 'e.g. Sohna Road, Sector 48'}
            list="checkout-areas"
          />
          {/* Localities for the pin code, offered as the customer types. */}
          <datalist id="checkout-areas">
            {lookup.areas.map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>

        <Field label="City" error={errors.city} className="lg:col-span-3">
          <input name="city" value={draft.city} onChange={set('city')} autoComplete="address-level2" placeholder="City" />
        </Field>

        <Field label="State" error={errors.state} className="lg:col-span-3">
          <input name="state" value={draft.state} onChange={set('state')} autoComplete="address-level1" placeholder="State" />
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
        <div className="mt-2.5 grid gap-x-3 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Nearby landmark" className="lg:col-span-2">
            <input name="near_by" value={draft.near_by} onChange={set('near_by')} placeholder="Shop / school / temple" />
          </Field>
          <Field label="Email" error={errors.email} className="lg:col-span-2">
            <input name="email" type="email" value={draft.email} onChange={set('email')} autoComplete="email" placeholder="For your invoice" />
          </Field>
          <Field label="Delivery note" className="sm:col-span-2 lg:col-span-2">
            <input name="message" value={draft.message} onChange={set('message')} placeholder="e.g. Call before coming" />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

/** Label, one input and its message — the input is styled here, not by the caller. */
function Field({ label, error, hint, className, children }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-[13px] font-medium text-ink-700">{label}</span>
      <span
        className={cx(
          'block [&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:bg-white [&_input]:px-3 [&_input]:text-[14.5px] [&_input]:text-ink-900 [&_input]:outline-none [&_input]:transition-colors [&_input]:placeholder:text-ink-300 [&_input]:focus:border-primary-500',
          error ? '[&_input]:border-danger' : '[&_input]:border-line-strong',
        )}
      >
        {children}
      </span>
      {error ? (
        <span className="mt-1 block text-[12.5px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12.5px]">{hint}</span>
      ) : null}
    </label>
  );
}

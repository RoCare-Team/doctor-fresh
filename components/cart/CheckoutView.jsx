'use client';

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock, Check, ShieldCheck, ShoppingBag, MapPin, CreditCard, ArrowLeft, ArrowRight, Pencil,
} from 'lucide-react';
import { useCart } from './CartProvider';
import { FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import SafeImage from '@/components/common/SafeImage';
import AddressStep from './AddressStep';
import { useSession, refreshSession } from '@/lib/useSession';
import { formatPrice, cx } from '@/lib/utils';

/**
 * Checkout, in the three steps the current site uses: review the order, enter
 * the delivery address, choose how to pay.
 *
 * Every number on the page — price, GST, shipping, coupon discount — is
 * calculated on the server from the catalogue. The browser only ever says
 * which products and how many, so a tampered price cannot reach an order.
 * The payment methods are the ones switched on in `business_settings`.
 */
export default function CheckoutView() {
  const { items, ready, clear } = useCart();
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  // The address confirmed in step 2, shown back on the payment step.
  const [address, setAddress] = useState(null);
  // Saved addresses to pick from, which one is picked ('new' for the form),
  // and what has been typed into the form.
  const [saved, setSaved] = useState([]);
  const [choice, setChoice] = useState('new');
  const [draft, setDraft] = useState(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState({});
  const formRef = useRef(null);
  const topRef = useRef(null);

  const updateDraft = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    // A field the customer is correcting stops showing its error.
    setAddressErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { delete next[k]; });
      return next;
    });
  };

  /**
   * Fill in what the account already knows: saved addresses to pick from, and
   * the name, mobile and email for a new one. Nothing is overwritten that the
   * customer has started typing.
   */
  useEffect(() => {
    if (!user) return undefined;
    let live = true;
    fetch('/api/account/addresses')
      .then((r) => r.json())
      .then((data) => {
        if (!live || !data.ok) return;
        setSaved(data.addresses || []);
        if (data.addresses?.length) setChoice(0);
        setDraft((d) => ({
          ...d,
          name: d.name || data.contact?.name || user.name || '',
          mobile: d.mobile || data.contact?.mobile || String(user.mobile || '').slice(-10),
          email: d.email || data.contact?.email || '',
        }));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [user]);

  /** The address that would be delivered to right now. */
  const currentAddress = () => (typeof choice === 'number' && saved[choice]
    ? { ...EMPTY_ADDRESS, ...saved[choice] }
    : draft);

  /**
   * Moves to a step. The page is left where it is unless the stepper has
   * scrolled out of sight — after a long address form on a phone — so the new
   * step never opens with the visitor looking at the bottom of the old one.
   */
  function goTo(next) {
    setError('');
    setStep(next);
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    // Below the sticky header (about 140px) means it is already in view.
    if (top < 140) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Checked here with the same rules the server applies, so a mistake shows
   * beside its field instead of coming back as an error at the last step.
   */
  function continueToPayment() {
    const a = currentAddress();
    const problems = validateAddress(a);

    if (Object.keys(problems).length) {
      // A saved address that no longer passes is opened in the form to fix.
      if (typeof choice === 'number') {
        setDraft(a);
        setChoice('new');
      }
      setAddressErrors(problems);
      const first = Object.keys(problems)[0];
      requestAnimationFrame(() => formRef.current?.querySelector(`[name="${first}"]`)?.focus());
      return;
    }

    setAddressErrors({});
    setAddress(a);
    goTo(3);
  }

  const lines = items.map((i) => ({ id: i.id, qty: i.qty }));
  const linesKey = JSON.stringify(lines);

  /** Reprice whenever the basket or the coupon changes. */
  const refresh = useCallback(async (code) => {
    const res = await fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: JSON.parse(linesKey), coupon: code ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    return data;
  }, [linesKey]);

  useEffect(() => {
    if (!ready || !lines.length) return;
    let cancelled = false;
    refresh(couponCode).then((data) => {
      if (cancelled) return;
      setQuote(data);
      if (data.ok && !payment) {
        setPayment(data.paymentOptions?.find((p) => p.ready)?.id || '');
      }
    });
    // eslint-disable-next-line consistent-return
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, linesKey, couponCode, refresh]);

  async function applyCoupon(event) {
    event.preventDefault();
    setCouponError('');
    const code = couponInput.trim();
    if (!code) return;

    const data = await refresh(code);
    if (!data.ok) {
      setCouponError(data.error || 'That coupon could not be applied.');
      return;
    }
    setCouponCode(code);
    setQuote(data);
  }

  async function placeOrder(event) {
    event.preventDefault();
    // Enter in a field on an earlier step moves the visitor on, never places
    // an order they have not reached the end of.
    if (step === 1) { goTo(2); return; }
    if (step === 2) { continueToPayment(); return; }
    setPlacing(true);
    setError('');

    // The address confirmed at step 2 — not whatever the form fields hold now.
    const delivery = address || currentAddress();

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: delivery, items: lines, coupon: couponCode, payment }),
      });
      const data = await res.json().catch(() => ({}));

      // The session expired while the form was open — swapping back to the
      // sign-in panel is clearer than an error above a form they cannot submit.
      if (data.signIn) {
        await refreshSession();
        return;
      }

      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not place your order. Please try again.');

      if (data.redirect) {
        // Easebuzz takes over from here; the cart is cleared when the payment
        // comes back confirmed, not before.
        window.location.href = data.redirect;
        return;
      }

      clear?.();
      router.push(data.href);
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-[14px] bg-surface-muted" />;

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Nothing to check out</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-400">Add a product to your cart first.</p>
        <Button href="/all-category" className="mt-5">Browse products</Button>
      </div>
    );
  }

  // Reached directly rather than through the Buy Now prompt. The basket is
  // untouched — the visitor only has to sign in to carry on.
  if (sessionLoading) return <div className="h-64 animate-pulse rounded-[14px] bg-surface-muted" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-[14px] border border-line bg-white px-6 py-12 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[19px] font-semibold text-ink-900">Sign in to place your order</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">
          Your basket is saved. Sign in or create an account and you will come straight back here.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button href="/registration?next=%2Fcart-checkout" size="lg" full>Create an account</Button>
          <Button href="/login?next=%2Fcart-checkout" variant="outline" size="lg" full>
            I already have an account
          </Button>
        </div>
      </div>
    );
  }

  const totals = quote?.totals;
  const paymentOptions = quote?.paymentOptions || [];
  const chosenPayment = paymentOptions.find((o) => o.id === payment);
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  return (
    <form ref={formRef} onSubmit={placeOrder} className="space-y-3">
      <div ref={topRef} className="flex scroll-mt-44 justify-center">
        <Stepper step={step} onBack={goTo} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="min-w-0">
          {/* ------------------------------------------------------ 1. order */}
          <Panel
            active={step === 1}
            icon={ShoppingBag}
            title="Review your order"
            note={`${itemCount} item${itemCount === 1 ? '' : 's'}`}
          >
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4 py-3 first:pt-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                    <SafeImage src={i.image} fill sizes="64px" className="object-contain p-1" iconSize={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={i.url} className="line-clamp-2 text-[14.5px] font-medium leading-snug text-ink-900 hover:text-primary-800">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-[13px] text-ink-400">Qty {i.qty}</p>
                  </div>
                  <p className="shrink-0 text-[15px] font-semibold text-ink-900">
                    {formatPrice((quote?.items?.find((q) => Number(q.id) === Number(i.id))?.price ?? i.price) * i.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-surface-muted p-3">
              <p className="mb-2 text-[13px] font-medium text-ink-700">Have a coupon?</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code"
                  aria-label="Coupon code"
                  className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="h-10 rounded-md border border-primary-500 bg-white px-4 text-[14px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  Apply
                </button>
              </div>
              {couponError ? <p className="mt-2 text-[13.5px] text-danger">{couponError}</p> : null}
              {quote?.coupon ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] text-success">
                  <Check size={14} aria-hidden="true" />
                  Coupon {quote.coupon.code} applied
                </p>
              ) : null}
            </div>

            <StepActions>
              <Button href="/cart" variant="ghost">
                <ArrowLeft size={16} aria-hidden="true" />
                Back to cart
              </Button>
              <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => goTo(2)}>
                Continue to address
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </StepActions>
          </Panel>

          {/* -------------------------------------------- 2. delivery address */}
          <Panel
            active={step === 2}
            icon={MapPin}
            title="Delivery address"
            note={saved.length ? 'Pick a saved address or add a new one' : 'Where should we deliver?'}
          >
            <AddressStep
              addresses={saved}
              choice={choice}
              onChoose={(c) => { setChoice(c); setAddressErrors({}); }}
              draft={draft}
              onDraft={updateDraft}
              errors={addressErrors}
            />

            <StepActions>
              <Button type="button" variant="ghost" onClick={() => goTo(1)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Button>
              <Button type="button" size="lg" className="w-full sm:w-auto" onClick={continueToPayment}>
                Continue to payment
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </StepActions>
          </Panel>

          {/* ------------------------------------------------------ 3. payment */}
          <Panel active={step === 3} icon={CreditCard} title="Payment" note="Choose how you want to pay">
            {address ? (
              <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-line bg-surface-muted p-3">
                <div className="min-w-0 text-[14px] leading-relaxed text-ink-700">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">Delivering to</p>
                  <p className="mt-1 font-semibold text-ink-900">{address.name}</p>
                  <p>
                    {[address.house_no, address.area, address.near_by && `Near ${address.near_by}`]
                      .filter(Boolean).join(', ')}
                  </p>
                  <p>{[address.city, address.state].filter(Boolean).join(', ')} – {address.c_pincode}</p>
                  <p className="text-ink-500">+91 {address.mobile}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-medium text-primary-700 hover:text-primary-800"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Change
                </button>
              </div>
            ) : null}

            {paymentOptions.length ? (
              <ul className="space-y-2.5">
                {paymentOptions.map((option) => (
                  <li key={option.id}>
                    <label
                      className={cx(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 text-[15px] transition-colors',
                        option.ready
                          ? 'border-line-strong text-ink-800 hover:border-primary-300 has-checked:border-primary-500 has-checked:bg-primary-50 has-checked:shadow-[0_0_0_3px_var(--color-primary-100)]'
                          : 'cursor-not-allowed border-line bg-surface-muted text-ink-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={option.id}
                        checked={payment === option.id}
                        disabled={!option.ready}
                        onChange={() => setPayment(option.id)}
                        className="h-4 w-4 accent-primary-600"
                        required
                      />
                      <span className="flex-1 font-medium">{option.label}</span>
                      {!option.ready ? <span className="text-[12.5px]">Not available yet</span> : null}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14.5px] text-ink-400">Loading payment options…</p>
            )}

            {error ? <div className="mt-4 lg:hidden"><FormNote status="error" error={error} /></div> : null}

            <StepActions>
              <Button type="button" variant="ghost" onClick={() => goTo(2)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Button>
              {/* The summary beside the steps carries this button on a wide
                  screen; on a phone that summary sits below, out of sight. */}
              <div className="w-full sm:w-auto lg:hidden">
                <Button type="submit" size="lg" full disabled={placing || !totals}>
                  {placing ? 'Placing order…' : `Place order${totals ? ` · ${formatPrice(totals.grandTotal)}` : ''}`}
                </Button>
              </div>
            </StepActions>
          </Panel>
        </div>

        {/* ------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-34.5 lg:self-start">
          <div className="df-card p-5">
            <h2 className="text-[16px] font-semibold text-ink-900">Order summary</h2>

            <dl className="mt-4 space-y-2.5 text-[14.5px]">
              <Row
                label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`}
                value={totals ? formatPrice(totals.subtotal) : '—'}
              />
              {totals?.discount > 0 ? (
                <Row label={`Coupon (${quote.coupon?.code})`} value={`− ${formatPrice(totals.discount)}`} tone="success" />
              ) : null}
              <Row label="GST" value={totals ? formatPrice(totals.tax) : '—'} />
              <Row
                label="Shipping"
                value={totals ? (totals.shipping ? formatPrice(totals.shipping) : 'Free') : '—'}
                tone={totals && !totals.shipping ? 'success' : undefined}
              />
              <div className="flex justify-between border-t border-line pt-3 text-[16px] font-semibold text-ink-900">
                <dt>Grand total</dt>
                <dd>{totals ? formatPrice(totals.grandTotal) : '—'}</dd>
              </div>
            </dl>

            {step === 3 && chosenPayment ? (
              <p className="mt-3 text-[13px] text-ink-500">
                Paying by <span className="font-medium text-ink-700">{chosenPayment.label}</span>
              </p>
            ) : null}

            {/* Desktop only: on a phone the payment step has its own button.
                The wrapper hides it — Button's own inline-flex would override
                a `hidden` passed to it directly. */}
            <div className="mt-5 hidden lg:block">
              <Button type="submit" size="lg" full disabled={placing || !totals || step < 3}>
                {placing ? 'Placing order…' : step < 3 ? `Complete step ${step} of 3` : 'Place order'}
              </Button>
            </div>

            {!quote?.ok && quote?.error ? (
              <div className="mt-3"><FormNote status="error" error={quote.error} /></div>
            ) : null}
            {error ? <div className="mt-3 hidden lg:block"><FormNote status="error" error={error} /></div> : null}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-ink-400">
              <Lock size={13} aria-hidden="true" />
              Your details are sent securely
            </p>

            <p className="mt-2 text-center text-[13px] text-ink-400">
              By placing the order you agree to our{' '}
              <Link href="/legal/terms-and-conditions" className="text-primary-700 hover:underline">
                terms and conditions
              </Link>.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

const EMPTY_ADDRESS = {
  name: '', mobile: '', email: '', house_no: '', area: '', near_by: '', city: '', state: '', c_pincode: '', message: '',
};

/** The rules /api/checkout applies, so the customer hears about them here first. */
function validateAddress(a) {
  const e = {};
  const text = (v) => String(v || '').trim();
  if (text(a.name).length < 2) e.name = 'Enter the full name';
  if (!/^[6-9]\d{9}$/.test(String(a.mobile || '').replace(/\D/g, '').slice(-10))) e.mobile = 'Enter a valid 10-digit mobile number';
  if (!/^\d{6}$/.test(text(a.c_pincode))) e.c_pincode = 'Enter a 6-digit pin code';
  if (!text(a.house_no)) e.house_no = 'Enter your house or flat number';
  if (!text(a.area)) e.area = 'Enter your area or road';
  if (!text(a.city)) e.city = 'Enter your city';
  if (!text(a.state)) e.state = 'Enter your state';
  if (text(a.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(a.email))) e.email = 'Enter a valid email';
  return e;
}

function Row({ label, value, tone }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-400">{label}</dt>
      <dd className={tone === 'success' ? 'text-success' : 'text-ink-700'}>{value}</dd>
    </div>
  );
}

const STEPS = [
  { n: 1, label: 'Order', hint: 'Review items', icon: ShoppingBag },
  { n: 2, label: 'Address', hint: 'Delivery details', icon: MapPin },
  { n: 3, label: 'Payment', hint: 'Pay and confirm', icon: CreditCard },
];

/**
 * The progress bar across the top, kept to a single row so the step itself
 * starts within the first screen. A finished step can be clicked to go back to
 * it; a later one cannot be jumped to, so the address is always checked before
 * payment.
 */
function Stepper({ step, onBack }) {
  return (
    <nav aria-label="Checkout progress" className="df-card w-full max-w-2xl px-2 py-2 sm:px-3">
      <ol className="flex items-center">
        {STEPS.map(({ n, label, hint, icon: Icon }, index) => {
          const done = n < step;
          const current = n === step;
          const last = index === STEPS.length - 1;

          const content = (
            <>
              <span
                className={cx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-primary-500 bg-primary-500 text-white',
                  current && 'border-primary-500 bg-white text-primary-600 shadow-[0_0_0_3px_var(--color-primary-100)]',
                  !done && !current && 'border-line-strong bg-white text-ink-300',
                )}
              >
                {done
                  ? <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  : <Icon size={16} aria-hidden="true" />}
              </span>
              <span className={cx('min-w-0 text-left leading-tight', !current && 'hidden sm:block')}>
                <span
                  className={cx(
                    'block whitespace-nowrap text-[13px] font-semibold sm:text-[14px]',
                    current && 'text-primary-700',
                    done && 'text-ink-900',
                    !done && !current && 'text-ink-400',
                  )}
                >
                  <span className="sr-only">{`Step ${n}: `}</span>
                  {label}
                </span>
                <span className="hidden whitespace-nowrap text-[12px] text-ink-400 md:block">{hint}</span>
              </span>
            </>
          );

          return (
            <li
              key={n}
              className={cx('flex items-center', !last && 'flex-1')}
              aria-current={current ? 'step' : undefined}
            >
              {done ? (
                <button
                  type="button"
                  onClick={() => onBack(n)}
                  className="flex shrink-0 items-center gap-2 rounded-full p-1 transition-colors hover:bg-surface-muted sm:gap-2.5 sm:pr-3"
                  aria-label={`Back to ${label}`}
                >
                  {content}
                </button>
              ) : (
                <span
                  className={cx(
                    'flex shrink-0 items-center gap-2 rounded-full p-1 sm:gap-2.5 sm:pr-3',
                    current && 'bg-primary-50 pr-3',
                  )}
                >
                  {content}
                </span>
              )}

              {/* The line to the next step, filled once this step is done. */}
              {!last ? (
                <span aria-hidden="true" className="mx-1.5 h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-line sm:mx-2">
                  <span
                    className={cx('block h-full bg-primary-500 transition-all duration-300', done ? 'w-full' : 'w-0')}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Panel({ active, icon: Icon, title, note, children }) {
  // Every step stays mounted — its fields belong to the one form that is
  // submitted — and only the current one is shown.
  return (
    <section className={cx('df-card p-4 sm:p-5', !active && 'hidden')}>
      <div className="mb-3 flex items-center gap-3 border-b border-line pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-ink-900">{title}</h2>
          {note ? <p className="text-[13px] text-ink-400">{note}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function StepActions({ children }) {
  return (
    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      {children}
    </div>
  );
}

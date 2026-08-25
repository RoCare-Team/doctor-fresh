'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Check } from 'lucide-react';
import { useCart } from './CartProvider';
import { Input, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import SafeImage from '@/components/common/SafeImage';
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
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

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
    setPlacing(true);
    setError('');

    const address = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, items: lines, coupon: couponCode, payment }),
      });
      const data = await res.json().catch(() => ({}));
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

  const totals = quote?.totals;
  const paymentOptions = quote?.paymentOptions || [];

  return (
    <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="space-y-4">
        {/* ------------------------------------------------------- 1. orders */}
        <Section n={1} title="Your order" open={step >= 1} done={step > 1}>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-3.5 first:pt-0">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-line">
                  <SafeImage src={i.image} fill sizes="56px" className="object-contain p-1" iconSize={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={i.url} className="line-clamp-2 text-[14.5px] leading-snug text-ink-900 hover:text-primary-800">
                    {i.name}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-ink-400">Qty {i.qty}</p>
                </div>
                <p className="shrink-0 text-[14.5px] text-ink-700">
                  {formatPrice((quote?.items?.find((q) => Number(q.id) === Number(i.id))?.price ?? i.price) * i.qty)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
              className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
            />
            <button
              type="button"
              onClick={applyCoupon}
              className="h-10 rounded-md border border-line-strong px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
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

          {step === 1 ? (
            <Button type="button" className="mt-5" onClick={() => setStep(2)}>Next</Button>
          ) : null}
        </Section>

        {/* --------------------------------------------- 2. delivery address */}
        <Section n={2} title="Delivery address" open={step >= 2} done={step > 2}>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Full name" name="name" required placeholder="Full name" autoComplete="name" />
            <Input label="Mobile number" name="mobile" type="tel" required pattern="[0-9]{10}" maxLength={10} placeholder="10 digit mobile number" autoComplete="tel" />
            <Input label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" className="sm:col-span-2" />
            <Input label="House / building no." name="house_no" required placeholder="House No. / Building No." className="sm:col-span-2" />
            <Input label="Road name / area" name="area" required placeholder="Road name / area" className="sm:col-span-2" />
            <Input label="Nearby landmark" name="near_by" placeholder="Nearby famous place / shop / school" className="sm:col-span-2" />
            <Input label="City" name="city" required placeholder="City" autoComplete="address-level2" />
            <Input label="State" name="state" required placeholder="State" autoComplete="address-level1" />
            <Input label="Pin code" name="c_pincode" required pattern="[0-9]{6}" maxLength={6} placeholder="6 digit pin code" autoComplete="postal-code" />
            <Textarea label="Delivery instructions" name="message" rows={2} placeholder="Optional" className="sm:col-span-2" />
          </div>

          {step === 2 ? (
            <Button type="button" className="mt-5" onClick={() => setStep(3)}>Next</Button>
          ) : null}
        </Section>

        {/* ------------------------------------------------ 3. payment method */}
        <Section n={3} title="Payment" open={step >= 3}>
          {paymentOptions.length ? (
            <ul className="space-y-2">
              {paymentOptions.map((option) => (
                <li key={option.id}>
                  <label
                    className={cx(
                      'flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-[14.5px] transition-colors',
                      option.ready
                        ? 'border-line-strong text-ink-700 hover:border-primary-300 has-checked:border-primary-500 has-checked:bg-primary-50'
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
                      className="accent-primary-600"
                      required
                    />
                    <span className="flex-1">{option.label}</span>
                    {!option.ready ? <span className="text-[12.5px]">Not available yet</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px] text-ink-400">Loading payment options…</p>
          )}
        </Section>
      </div>

      {/* --------------------------------------------------------- summary */}
      <aside className="lg:sticky lg:top-34.5 lg:self-start">
        <div className="df-card p-5">
          <h2 className="text-[16px] font-semibold text-ink-900">Order summary</h2>

          <dl className="mt-4 space-y-2.5 text-[14.5px]">
            <Row label="Subtotal" value={totals ? formatPrice(totals.subtotal) : '—'} />
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

          <Button type="submit" size="lg" full className="mt-5" disabled={placing || !totals || step < 3}>
            {placing ? 'Placing order…' : 'Place order'}
          </Button>

          {!quote?.ok && quote?.error ? (
            <div className="mt-3"><FormNote status="error" error={quote.error} /></div>
          ) : null}
          {error ? <div className="mt-3"><FormNote status="error" error={error} /></div> : null}

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
    </form>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-400">{label}</dt>
      <dd className={tone === 'success' ? 'text-success' : 'text-ink-700'}>{value}</dd>
    </div>
  );
}

function Section({ n, title, open, done, children }) {
  return (
    <section className="df-card p-5">
      <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-ink-900">
        <span
          className={cx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold',
            done ? 'bg-success text-white' : open ? 'bg-primary-500 text-white' : 'bg-surface-muted text-ink-400',
          )}
        >
          {done ? <Check size={13} aria-hidden="true" /> : n}
        </span>
        {title}
      </h2>

      {/* Later steps stay mounted so their fields are part of the form, but
          collapse until the visitor gets to them. */}
      <div className={cx('mt-4', open ? '' : 'hidden')}>{children}</div>
    </section>
  );
}

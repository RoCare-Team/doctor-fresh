'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { useCart } from './CartProvider';
import { useFormSubmit } from '@/lib/forms';
import { Input, Select, Textarea, RadioGroup, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { formatPrice, imageUrl } from '@/lib/utils';

const PAYMENT_METHODS = ['Online payment', 'Cash on delivery', 'EMI'];

export default function CheckoutView() {
  const { items, ready, subtotal, mrpTotal, savings } = useCart();
  const { status, error, send, sending } = useFormSubmit('/cart-checkout');

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[14px] bg-surface-muted" />;
  }

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Nothing to check out</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-400">Add a product to your cart first.</p>
        <Button href="/all-category" className="mt-5">Browse products</Button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="space-y-6">
        <section className="df-card p-5">
          <h2 className="mb-4 text-[16px] font-semibold text-ink-900">1. Customer details</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Full name" name="name" required placeholder="Full name" />
            <Input label="Mobile number" name="mobile" type="tel" required pattern="[0-9]{10}" placeholder="10 digit mobile number" />
            <Input label="Email" name="email" type="email" required placeholder="you@example.com" className="sm:col-span-2" />
          </div>
        </section>

        <section className="df-card p-5">
          <h2 className="mb-4 text-[16px] font-semibold text-ink-900">2. Delivery address</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="House / building no." name="house_no" required placeholder="House No. / Building No." />
            <Input label="Road name / area" name="area" required placeholder="Road name / area" />
            <Input label="Nearby landmark" name="near_by" placeholder="Nearby famous place / shop / school" className="sm:col-span-2" />
            <Input label="City" name="city" required placeholder="City" />
            <Input label="State" name="state" required placeholder="State" />
            <Input label="Pin code" name="c_pincode" required pattern="[0-9]{6}" placeholder="6 digit pin code" />
            <Textarea label="Delivery instructions" name="message" rows={2} placeholder="Optional" className="sm:col-span-2" />
          </div>
        </section>

        <section className="df-card p-5">
          <h2 className="mb-4 text-[16px] font-semibold text-ink-900">3. Shipping</h2>
          <RadioGroup
            name="shipping"
            required
            options={['Standard delivery (free)', 'Express delivery']}
          />
          <p className="mt-3 text-[13.5px] text-ink-400">
            Installation is scheduled by our service team after delivery.
          </p>
        </section>

        <section className="df-card p-5">
          <h2 className="mb-4 text-[16px] font-semibold text-ink-900">4. Payment</h2>
          <Select name="payment" required placeholder="Select payment method" options={PAYMENT_METHODS} />
          <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-ink-400">
            <Lock size={13} aria-hidden="true" />
            Payment is processed on the secure Doctor Fresh gateway.
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-[138px] lg:self-start">
        <div className="df-card p-5">
          <h2 className="text-[16px] font-semibold text-ink-900">Order summary</h2>

          <ul className="mt-4 space-y-3 border-b border-line pb-4">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-line">
                  <Image src={imageUrl(i.image)} alt="" fill sizes="48px" className="object-contain p-1" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13.5px] leading-snug text-ink-700">{i.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-400">Qty {i.qty}</p>
                </div>
                <span className="text-[14px] font-medium text-ink-900">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 text-[14.5px]">
            <div className="flex justify-between">
              <dt className="text-ink-400">Item total (MRP)</dt>
              <dd className="text-ink-700">{formatPrice(mrpTotal)}</dd>
            </div>
            {savings > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-400">Discount</dt>
                <dd className="text-success">− {formatPrice(savings)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-400">Shipping</dt>
              <dd className="text-success">Free</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-[16px] font-semibold text-ink-900">
              <dt>Total payable</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
          </dl>

          <Button type="submit" size="lg" full className="mt-5" disabled={sending}>
            {sending ? 'Placing order…' : 'Place order'}
          </Button>

          {status !== 'idle' ? (
            <div className="mt-3">
              <FormNote
                status={status}
                error={error}
                doneMessage="Order details received — our team will confirm your order by phone."
              />
            </div>
          ) : null}

          <p className="mt-3 text-center text-[13px] text-ink-400">
            By placing the order you agree to our{' '}
            <Link href="/legal/terms-and-conditions" className="text-primary-700 hover:underline">
              terms &amp; conditions
            </Link>
            .
          </p>
        </div>
      </aside>
    </form>
  );
}

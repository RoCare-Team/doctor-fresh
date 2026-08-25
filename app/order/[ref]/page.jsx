import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import Button from '@/components/common/Button';
import { getOrder } from '@/lib/sql/orders';
import { getSession } from '@/lib/auth/session';
import { getBrand } from '@/lib/catalog';
import { formatPrice, metaFor } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** The stored value is the gateway id; visitors read a name. */
const PAYMENT_LABEL = {
  cash_on_delivery: 'Cash on delivery',
  easebuzz: 'Paid online',
  sslcommerz: 'Paid online (SSLCommerz)',
  paytm: 'Paytm',
  ccavenue: 'CCAvenue',
  pum: 'PayUmoney',
  stripe: 'Card',
  paypal: 'PayPal',
};

export const metadata = metaFor({
  title: 'Order placed',
  description: 'Your Doctor Fresh order confirmation.',
  path: '/order',
  robots: { index: false, follow: false },
});

/**
 * Order confirmation. `ref` is the sale id for a signed-in buyer, or the guest
 * id for a guest — the same two ways the PHP invoice page is reached.
 */
export default async function OrderPage({ params }) {
  const { ref } = await params;
  const session = await getSession();

  // Guest ids look like "162-9f3a1c4b7e"; a sale id is digits only.
  const isGuestRef = ref.includes('-');
  const order = await getOrder(
    isGuestRef ? { guestId: ref } : { saleId: Number(ref), userId: session?.id },
  );
  if (!order) notFound();

  const brand = await getBrand();
  const address = order.address || {};

  return (
    <div className="df-container py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="df-card p-6 md:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={26} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <h1 className="text-[22px] font-semibold text-ink-900 md:text-[26px]">Order placed</h1>
              <p className="mt-1.5 text-[14.5px] text-ink-500">
                Order <span className="font-medium text-ink-900">{order.code}</span> — our team will call you
                on {address.mobile} to confirm delivery.
              </p>
            </div>
          </div>

          <ul className="mt-7 space-y-3 border-t border-line pt-6">
            {order.items.map((i) => (
              <li key={i.rowid || i.id} className="flex items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-[14.5px] leading-snug text-ink-900">{i.name}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-400">Qty {i.qty}</span>
                </span>
                <span className="shrink-0 text-[14.5px] text-ink-700">{formatPrice(i.subtotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-[14.5px]">
            <div className="flex justify-between text-ink-500">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-ink-500">
              <dt>GST</dt>
              <dd>{formatPrice(order.totals.tax)}</dd>
            </div>
            <div className="flex justify-between text-ink-500">
              <dt>Shipping</dt>
              <dd>{formatPrice(order.totals.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold text-ink-900">
              <dt>Total</dt>
              <dd>{formatPrice(order.totals.grandTotal)}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-3 border-t border-line pt-6 text-[14px] text-ink-500 sm:grid-cols-2">
            <p className="flex gap-2">
              <Package size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
              <span>
                <strong className="block font-medium text-ink-700">Delivering to</strong>
                {address.name}, {address.house_no} {address.area}, {address.city} {address.c_pincode}
              </span>
            </p>
            <p className="flex gap-2">
              <Truck size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
              <span>
                <strong className="block font-medium text-ink-700">Payment</strong>
                {PAYMENT_LABEL[order.paymentType] || PAYMENT_LABEL[address.payment] || 'Cash on delivery'}
                {order.paid ? ' — paid' : null}
              </span>
            </p>
          </div>

          {order.guestId ? (
            <p className="mt-6 rounded-md border border-line bg-surface-muted px-3.5 py-2.5 text-[13.5px] text-ink-500">
              Keep this link to check your order later — you ordered as a guest.
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/all-category">Continue shopping</Button>
            <Button href={`tel:${brand.phoneRaw}`} variant="outline">Call {brand.phone}</Button>
          </div>
        </div>

        <p className="mt-5 text-center text-[14px] text-ink-400">
          Questions? <Link href="/contact" className="text-primary-700 hover:text-primary-800">Contact us</Link>
        </p>
      </div>
    </div>
  );
}

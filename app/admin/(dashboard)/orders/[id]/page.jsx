import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, MapPin, Phone, Mail } from 'lucide-react';
import { getOrder, DELIVERY_STATUSES } from '@/lib/sql/admin';
import OrderControls from '@/components/admin/OrderControls';
import StatusPill from '@/components/admin/StatusPill';
import { formatPrice, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order' };

export default async function AdminOrderPage({ params }) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();

  return (
    <>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 transition-colors hover:text-primary-700"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">{order.code || `Order ${order.id}`}</h1>
          <p className="mt-1 text-[14px] text-ink-400">
            Placed {formatDate(order.placedAt)} ·{' '}
            {order.paymentType === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentType}
          </p>
        </div>
        <StatusPill status={order.delivery} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-semibold text-ink-900">Items</h2>
            <table className="w-full text-left text-[14px]">
              <tbody className="divide-y divide-line">
                {order.items.map((i, index) => (
                  <tr key={`${i.id}-${index}`}>
                    <td className="px-5 py-3 text-ink-900">{i.name}</td>
                    <td className="px-5 py-3 text-right text-ink-500">× {i.qty}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatPrice(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 border-t border-line bg-surface-muted px-5 py-4 text-[14px]">
              <div className="flex justify-between text-ink-500">
                <dt>GST</dt>
                <dd>{formatPrice(order.tax)}</dd>
              </div>
              <div className="flex justify-between text-ink-500">
                <dt>Shipping</dt>
                <dd>{formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold text-ink-900">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Customer</h2>
            <ul className="mt-3 space-y-2.5 text-[14px] text-ink-500">
              <li className="flex gap-2.5">
                <User size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                <span>
                  {order.customer.name || '—'}
                  {order.guestId ? <span className="ml-1.5 text-ink-300">(guest)</span> : null}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Phone size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                <a href={`tel:${order.customer.mobile}`} className="text-primary-700 hover:text-primary-800">
                  {order.customer.mobile || '—'}
                </a>
              </li>
              {order.customer.email ? (
                <li className="flex gap-2.5">
                  <Mail size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                  <a href={`mailto:${order.customer.email}`} className="text-primary-700 hover:text-primary-800">
                    {order.customer.email}
                  </a>
                </li>
              ) : null}
              <li className="flex gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                <span>{order.customer.address || '—'}</span>
              </li>
            </ul>
          </div>
        </div>

        <aside>
          <OrderControls
            saleId={order.id}
            delivery={order.delivery}
            paid={order.paid}
            statuses={DELIVERY_STATUSES}
          />
        </aside>
      </div>
    </>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, MapPin, Phone, Mail, StickyNote } from 'lucide-react';
import { getOrder, DELIVERY_STATUSES } from '@/lib/sql/admin';
import OrderControls from '@/components/admin/OrderControls';
import StatusPill from '@/components/admin/StatusPill';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice, formatDate, formatDateTime, cx } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order' };

export default async function AdminOrderPage({ params }) {
  await requirePage('orders');
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
        <div className="flex items-center gap-1.5">
          <span
            className={cx(
              'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium',
              order.paid ? 'bg-success/12 text-success' : 'bg-surface-muted text-ink-500',
            )}
          >
            {order.paid ? 'Paid' : 'Payment due'}
          </span>
          <StatusPill status={order.delivery} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-semibold text-ink-900">
              {`Items (${order.itemCount})`}
            </h2>
            <table className="w-full text-left text-[14px]">
              <tbody className="divide-y divide-line">
                {order.items.map((i, index) => (
                  <tr key={`${i.id}-${index}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                          <SafeImage src={i.image} fill sizes="48px" className="object-contain p-1" iconSize={16} />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${i.id}`}
                            className="font-medium text-ink-900 hover:text-primary-700"
                          >
                            {i.name}
                          </Link>
                          <span className="block text-[12.5px] text-ink-400">
                            {`${formatPrice(i.price)} each`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-500">× {i.qty}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatPrice(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 border-t border-line bg-surface-muted px-5 py-4 text-[14px]">
              <div className="flex justify-between text-ink-500">
                <dt>Items</dt>
                <dd>{formatPrice(order.total - order.tax - order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-ink-500">
                <dt>{order.taxPercent ? `GST (${order.taxPercent}%)` : 'GST'}</dt>
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

          {/* --------------------------------------------------- payment */}
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Payment</h2>

            <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-[14px] sm:grid-cols-2">
              <div>
                <dt className="text-[12.5px] uppercase tracking-wide text-ink-400">Method</dt>
                <dd className="text-ink-900">
                  {order.paymentType === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentType || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] uppercase tracking-wide text-ink-400">Status</dt>
                <dd className={order.paid ? 'font-medium text-success' : 'font-medium text-ink-500'}>
                  {order.paid ? 'Paid' : 'Payment due'}
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] uppercase tracking-wide text-ink-400">Amount</dt>
                <dd className="text-ink-900">{formatPrice(order.total)}</dd>
              </div>
              <div>
                <dt className="text-[12.5px] uppercase tracking-wide text-ink-400">Paid on</dt>
                <dd className="text-ink-900">{order.paidAt ? formatDateTime(order.paidAt) : '—'}</dd>
              </div>
            </dl>

            {/* Every attempt the gateway recorded, so a failed payment on an
                order that looks unpaid has an explanation beside it. */}
            {order.attempts?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="text-[12px] uppercase tracking-wide text-ink-400">
                    <tr>
                      <th className="py-1.5 font-semibold">Attempt</th>
                      <th className="py-1.5 font-semibold">Gateway</th>
                      <th className="py-1.5 font-semibold">Reference</th>
                      <th className="py-1.5 text-right font-semibold">Amount</th>
                      <th className="py-1.5 text-right font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {order.attempts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 text-ink-500">{formatDateTime(a.at)}</td>
                        <td className="py-2 text-ink-500">{a.gateway}</td>
                        <td className="py-2 text-ink-500">{a.reference || '—'}</td>
                        <td className="py-2 text-right text-ink-700">{formatPrice(a.amount)}</td>
                        <td className="py-2 text-right">
                          <span
                            className={cx(
                              'rounded-full px-2 py-0.5 text-[12px] font-medium',
                              a.status === 'success' ? 'bg-success/12 text-success'
                                : a.status === 'failed' ? 'bg-danger/10 text-danger'
                                  : 'bg-surface-muted text-ink-500',
                            )}
                          >
                            {a.status || 'unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Customer</h2>
            <ul className="mt-3 space-y-2.5 text-[14px] text-ink-500">
              <li className="flex gap-2.5">
                <User size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                <span>
                  {order.buyer && !order.guestId ? (
                    <Link href={`/admin/customers/${order.buyer}`} className="text-primary-700 hover:text-primary-800">
                      {order.customer.name || `Customer ${order.buyer}`}
                    </Link>
                  ) : (
                    order.customer.name || '—'
                  )}
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
                <span>
                  {order.customer.address || '—'}
                  {order.customer.type ? (
                    <span className="ml-1.5 rounded bg-surface-muted px-1.5 py-0.5 text-[11.5px] uppercase tracking-wide text-ink-400">
                      {order.customer.type}
                    </span>
                  ) : null}
                </span>
              </li>
              {order.customer.note ? (
                <li className="flex gap-2.5">
                  <StickyNote size={15} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                  <span className="italic">{order.customer.note}</span>
                </li>
              ) : null}
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

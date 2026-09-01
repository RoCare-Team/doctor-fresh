import Link from 'next/link';
import Pagination, { paginate } from '@/components/admin/Pagination';
import { Search } from 'lucide-react';
import { listOrders, DELIVERY_STATUSES } from '@/lib/sql/admin';
import { formatPrice, formatDate, cx } from '@/lib/utils';
import StatusPill from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders' };

export default async function AdminOrdersPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status || '';
  const search = (params?.q || '').trim();
  const page = Number(params?.page) || 1;

  const view = paginate(await listOrders({ status, search, limit: 500 }) || [], page);
  const orders = view.rows;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Orders</h1>
        <span className="text-[14px] text-ink-400">{orders?.length ?? 0} shown</span>
      </div>

      {/* Filters are plain links so the page stays a server component and a
          filtered view can be bookmarked or shared. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/orders"
          className={cx(
            'rounded-lg border px-3 py-1.5 text-[13.5px] transition-colors',
            !status ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
          )}
        >
          All
        </Link>
        {DELIVERY_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${encodeURIComponent(s)}`}
            className={cx(
              'rounded-lg border px-3 py-1.5 text-[13.5px] capitalize transition-colors',
              status === s ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
            )}
          >
            {s === 'order cancelled' ? 'Cancelled' : s}
          </Link>
        ))}

        <form action="/admin/orders" className="ml-auto flex items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <span className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Order code, name, mobile"
              aria-label="Search orders"
              className="h-9 w-56 rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
            />
          </span>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="border-b border-line bg-surface-muted text-[12.5px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="px-4 py-2.5 font-semibold">Items</th>
              <th className="px-4 py-2.5 font-semibold">Placed</th>
              <th className="px-4 py-2.5 font-semibold">Payment</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(orders || []).map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary-700 hover:text-primary-800">
                    {o.code || o.id}
                  </Link>
                  {o.guestId ? <span className="block text-[12px] text-ink-300">guest</span> : null}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {o.customer.name || '—'}
                  <span className="block text-[12.5px] text-ink-400">{o.customer.mobile}</span>
                </td>
                <td className="px-4 py-3 text-ink-500">{o.itemCount}</td>
                <td className="px-4 py-3 text-ink-500">{formatDate(o.placedAt)}</td>
                <td className="px-4 py-3">
                  <span className={cx('text-[13px]', o.paid ? 'text-success' : 'text-ink-500')}>
                    {o.paid ? 'Paid' : 'Due'}
                  </span>
                  <span className="block text-[12px] text-ink-300">
                    {o.paymentType === 'cash_on_delivery' ? 'COD' : o.paymentType}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusPill status={o.delivery} /></td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!orders?.length ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-ink-400">No orders match this view.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination {...view} params={{ status, q: search }} label="orders" />
    </>
  );
}

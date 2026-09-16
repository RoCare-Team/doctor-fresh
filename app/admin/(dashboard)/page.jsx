import Link from 'next/link';
import {
  Package, Clock, Inbox, Phone, Mail, IndianRupee, ChevronRight, ShoppingBag, Wallet,
} from 'lucide-react';
import {
  getDashboard, listOrders, RANGES, rangeStart, DEFAULT_RANGE,
} from '@/lib/sql/admin';
import RangeSelect from '@/components/admin/RangeSelect';
import { formatPrice, formatDate, cx } from '@/lib/utils';
import StatusPill from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function AdminDashboard({ searchParams }) {
  const params = await searchParams;
  const rangeId = params?.range || DEFAULT_RANGE;
  const [stats, recent] = await Promise.all([
    getDashboard(rangeId),
    listOrders({ from: rangeStart(rangeId), limit: 25 }),
  ]);
  const { range } = stats;

  const cards = [
    // The whole order book leads, then the window chosen above.
    { label: 'All orders', value: stats.totalOrders, icon: ShoppingBag, href: '/admin/orders' },
    { label: 'All sales (paid)', value: formatPrice(stats.totalSales), icon: Wallet, href: '/admin/orders' },
    // With "All orders" chosen these two would repeat the pair above, so they
    // only appear once a narrower window is picked.
    ...(range.id === 'all' ? [] : [
      { label: `Orders ${range.noun}`, value: stats.ordersToday, icon: Package, href: '/admin/orders' },
      { label: `Sales ${range.noun}`, value: formatPrice(stats.salesToday), icon: IndianRupee, href: '/admin/orders' },
    ]),
    { label: 'Orders to process', value: stats.pendingOrders, icon: Clock, href: '/admin/orders?status=pending' },
    { label: 'Open enquiries', value: stats.openLeads, icon: Inbox, href: '/admin/enquiries' },
    { label: 'Callback requests', value: stats.openCallbacks, icon: Phone, href: '/admin/enquiries?tab=callbacks' },
    { label: 'Unread messages', value: stats.unreadMessages, icon: Mail, href: '/admin/enquiries?tab=messages' },
  ];

  return (
    <>
      <h1 className="text-[22px] font-semibold text-ink-900">Dashboard</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-primary-300"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13px] text-ink-400">{label}</span>
              <span className="block text-[19px] font-semibold text-ink-900">{value}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* The window sits over the table it filters — and the cards above read
          the same window. */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-ink-900">
          {range.id === 'all' ? 'Latest orders' : `Orders ${range.noun}`}
        </h2>
        <div className="flex items-center gap-3">
          <RangeSelect ranges={RANGES} value={range.id} />
          <Link href="/admin/orders" className="text-[14px] font-medium text-primary-700 hover:text-primary-800">
            View all
          </Link>
        </div>
      </div>

      {/* The list scrolls inside its own box — a long window of orders should
          not push the rest of the admin off the screen — and the heading row
          stays put while it does. */}
      <div className="df-scrollbar mt-3 max-h-130 overflow-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-180 border-separate border-spacing-0 text-left text-[14px]">
          <thead className="sticky top-0 z-10 bg-surface-muted text-[12.5px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="border-b border-line px-4 py-3 font-semibold">Order</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Customer</th>
              <th className="hidden border-b border-line px-4 py-3 font-semibold sm:table-cell">Placed</th>
              {/* Two different things, so two columns: whether the money
                  arrived, and how far the order has travelled. */}
              <th className="border-b border-line px-4 py-3 font-semibold">Payment</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Delivery</th>
              <th className="border-b border-line px-4 py-3 text-right font-semibold">Total</th>
              <th className="border-b border-line px-4 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(recent || []).map((o) => (
              <tr key={o.id} className="group transition-colors hover:bg-primary-50/40">
                <td className="border-b border-line px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {o.code || o.id}
                  </Link>
                  <span className="block text-[12px] text-ink-300 sm:hidden">{formatDate(o.placedAt)}</span>
                </td>

                <td className="border-b border-line px-4 py-3 text-ink-700">
                  <span className="flex items-center gap-2.5">
                    {/* An initial reads faster down a column than a name does. */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold uppercase text-primary-700">
                      {(o.customer.name || '?').trim().charAt(0)}
                    </span>
                    <span className="min-w-0">
                      {o.buyer && !o.guestId ? (
                        <Link
                          href={`/admin/customers/${o.buyer}`}
                          className="block truncate font-medium text-ink-900 hover:text-primary-700"
                        >
                          {o.customer.name || `Customer ${o.buyer}`}
                        </Link>
                      ) : (
                        <span className="block truncate font-medium text-ink-900">
                          {o.customer.name || '—'}
                          {o.guestId ? <span className="ml-1.5 text-[12px] font-normal text-ink-300">guest</span> : null}
                        </span>
                      )}
                      <span className="block text-[12.5px] text-ink-400">{o.customer.mobile}</span>
                    </span>
                  </span>
                </td>

                <td className="hidden border-b border-line px-4 py-3 text-ink-500 sm:table-cell">
                  {formatDate(o.placedAt)}
                </td>

                <td className="border-b border-line px-4 py-3">
                  <span
                    className={cx(
                      'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium',
                      // Amber already means "pending delivery" in the next
                      // column, so an unpaid order stays neutral here.
                      o.paid ? 'bg-success/12 text-success' : 'bg-surface-muted text-ink-500',
                    )}
                  >
                    {o.paid ? 'Paid' : 'Due'}
                  </span>
                  <span className="mt-0.5 block text-[12px] uppercase tracking-wide text-ink-300">
                    {o.paymentType === 'cash_on_delivery' ? 'COD' : o.paymentType}
                  </span>
                </td>

                <td className="border-b border-line px-4 py-3"><StatusPill status={o.delivery} /></td>

                <td className="border-b border-line px-4 py-3 text-right font-semibold text-ink-900">
                  {formatPrice(o.total)}
                </td>

                <td className="border-b border-line px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors group-hover:border-primary-500 group-hover:text-primary-700"
                  >
                    View detail
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
            {!recent?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-400">
                  {range.id === 'all' ? 'No orders yet.' : `No orders ${range.noun}.`}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

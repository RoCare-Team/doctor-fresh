import Link from 'next/link';
import {
  Clock, Inbox, Phone, Mail, ChevronRight, ShoppingBag, Wallet, Users, Plus, Shuffle, ArrowRight, CheckCircle2,
} from 'lucide-react';
import {
  getDashboard, getDailyOrders, listOrders, RANGES, rangeStart, DEFAULT_RANGE,
} from '@/lib/sql/admin';
import { getAdminSession } from '@/lib/admin/session';
import RangeSelect from '@/components/admin/RangeSelect';
import OrdersChart from '@/components/admin/OrdersChart';
import { formatPrice, formatDate, cx } from '@/lib/utils';
import StatusPill from '@/components/admin/StatusPill';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function AdminDashboard({ searchParams }) {
  await requirePage('dashboard');
  const params = await searchParams;
  const rangeId = params?.range || DEFAULT_RANGE;
  const [stats, recent, daily, admin] = await Promise.all([
    getDashboard(rangeId),
    listOrders({ from: rangeStart(rangeId), limit: 25 }),
    getDailyOrders(14),
    getAdminSession(),
  ]);
  const { range } = stats;

  // Greeting and date on the Indian clock, whatever zone the server runs in.
  const now = new Date();
  const hour = Number(now.toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const firstName = String(admin?.name || 'there').trim().split(/\s+/)[0];

  const tiles = [
    {
      label: 'All orders', value: stats.totalOrders.toLocaleString('en-IN'), note: range.id === 'all' ? 'orders placed so far' : `${stats.ordersToday} ${range.noun}`,
      icon: ShoppingBag, href: '/admin/orders', tone: 'from-primary-500 to-primary-700', wash: 'bg-primary-50',
    },
    {
      label: 'Paid sales', value: formatPrice(stats.totalSales), note: range.id === 'all' ? 'collected from paid orders' : `${formatPrice(stats.salesToday)} ${range.noun}`,
      icon: Wallet, href: '/admin/orders', tone: 'from-emerald-500 to-emerald-700', wash: 'bg-emerald-50',
    },
    {
      label: 'Customers', value: stats.customers.toLocaleString('en-IN'), note: 'registered accounts',
      icon: Users, href: '/admin/customers', tone: 'from-violet-500 to-violet-700', wash: 'bg-violet-50',
    },
    {
      label: 'Orders to process', value: stats.pendingOrders.toLocaleString('en-IN'), note: 'waiting for delivery',
      icon: Clock, href: '/admin/orders?status=pending', tone: 'from-amber-400 to-amber-600', wash: 'bg-amber-50',
    },
  ];

  const attention = [
    { label: 'Orders to process', value: stats.pendingOrders, icon: Clock, href: '/admin/orders?status=pending' },
    { label: 'Open enquiries', value: stats.openLeads, icon: Inbox, href: '/admin/enquiries' },
    { label: 'Callback requests', value: stats.openCallbacks, icon: Phone, href: '/admin/enquiries?tab=callbacks' },
    { label: 'Unread messages', value: stats.unreadMessages, icon: Mail, href: '/admin/messages' },
  ];
  const quickActions = [
    { label: 'Add product', icon: Plus, href: '/admin/products/new' },
    { label: 'View orders', icon: ShoppingBag, href: '/admin/orders' },
    { label: 'Redirects', icon: Shuffle, href: '/admin/uniredirect' },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ welcome */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary-500 via-primary-700 to-ink-900 px-5 py-5 text-white shadow-[0_24px_50px_-30px_rgb(6_59_76/0.8)] md:px-7 md:py-5">
        <span aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-white/5" />
        <span aria-hidden="true" className="absolute right-10 top-4 hidden h-20 w-20 rounded-full border-10 border-white/10 md:block" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-medium !text-white/75">{today}</p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight !text-white md:text-[26px]">
              {`${greeting}, ${firstName}`}
              <span aria-hidden="true"> 👋</span>
            </h1>
            <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed !text-white/85">
              {stats.pendingOrders
                ? `${stats.pendingOrders} orders are waiting to be processed, and ${stats.ordersToday} orders came in ${range.noun}.`
                : 'Every order is on its way — nothing waiting to be processed.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickActions.map(({ label, icon: Icon, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/12 px-3.5 text-[13.5px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white hover:text-primary-800"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map(({
          label, value, note, icon: Icon, href, tone, wash,
        }) => (
          <Link
            key={label}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-line bg-white p-4 transition-all sm:p-5 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgb(6_59_76/0.55)]"
          >
            <span aria-hidden="true" className={cx('absolute -right-8 -top-8 h-28 w-28 rounded-full transition-transform group-hover:scale-110', wash)} />
            <div className="relative flex flex-col-reverse items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-ink-400 sm:text-[13.5px]">{label}</p>
                <p className="mt-1.5 truncate text-[22px] font-bold leading-none tracking-tight text-ink-900 sm:mt-2 sm:text-[28px]">{value}</p>
                <p className="mt-2 text-[12px] leading-snug text-ink-400 sm:mt-2.5 sm:text-[12.5px]">{note}</p>
              </div>
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white sm:h-12 sm:w-12 sm:rounded-2xl shadow-[0_10px_20px_-10px_rgb(6_59_76/0.6)]', tone)}>
                <Icon size={22} aria-hidden="true" />
              </span>
            </div>
            {/* Sits in the corner, over the card rather than below it, so the
                hover hint never adds height to the tile. */}
            <span className="absolute bottom-3 right-4 hidden items-center gap-1 text-[12.5px] font-semibold text-primary-700 opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">
              View
              <ArrowRight size={13} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      {/* ---------------------------------------------- chart + to-do column */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-2xl border border-line bg-white p-5">
          <OrdersChart days={daily} />
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">Needs your attention</h2>
          <ul className="mt-3 space-y-1.5">
            {attention.map(({ label, value, icon: Icon, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2 transition-colors hover:border-primary-200 hover:bg-primary-50/50"
                >
                  <span className={cx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    value ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                  )}
                  >
                    {value ? <Icon size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-ink-800">{label}</span>
                  {value ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-bold tabular-nums text-amber-700">{value}</span>
                  ) : (
                    <span className="text-[12.5px] font-medium text-emerald-600">All clear</span>
                  )}
                  <ChevronRight size={15} className="text-ink-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
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

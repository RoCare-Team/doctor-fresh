import Link from 'next/link';
import Pagination, { paginate } from '@/components/admin/Pagination';
import {
  Search, ChevronRight, ShoppingBag, IndianRupee, Clock, Truck, X,
} from 'lucide-react';
import {
  listOrders, DELIVERY_STATUSES, RANGES, rangeFor, rangeStart,
} from '@/lib/sql/admin';
import RangeSelect from '@/components/admin/RangeSelect';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice, formatDate, cx } from '@/lib/utils';
import StatusPill from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders' };

const STATUS_LABEL = {
  pending: 'Pending', shipped: 'Shipped', delivered: 'Delivered', 'order cancelled': 'Cancelled',
};

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const timeOf = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default async function AdminOrdersPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status || '';
  const search = (params?.q || '').trim();
  const page = Number(params?.page) || 1;
  // The orders list opens on everything; the dashboard opens on today.
  const rangeId = params?.range || 'all';
  const range = rangeFor(rangeId);

  // One query for the window and search; the status tabs are counted and
  // filtered from it, so every tab can show how many orders it holds.
  const all = (await listOrders({ search, from: rangeStart(rangeId), limit: 500 })) || [];
  const counts = Object.fromEntries(DELIVERY_STATUSES.map((s) => [s, 0]));
  let paidValue = 0;
  let paidCount = 0;
  for (const o of all) {
    if (o.delivery in counts) counts[o.delivery] += 1;
    if (o.paid) { paidValue += o.total; paidCount += 1; }
  }
  const view = paginate(status ? all.filter((o) => o.delivery === status) : all, page);
  const orders = view.rows;

  const query = (next) => {
    const p = new URLSearchParams();
    const merged = { status, q: search, range: rangeId === 'all' ? '' : rangeId, ...next };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `/admin/orders?${s}` : '/admin/orders';
  };

  const stats = [
    { label: 'Orders', value: all.length, note: range.id === 'all' ? 'All time' : range.label, icon: ShoppingBag, tone: 'from-primary-400 to-primary-700' },
    { label: 'Paid sales', value: formatPrice(paidValue), note: `${paidCount} paid order${paidCount === 1 ? '' : 's'}`, icon: IndianRupee, tone: 'from-emerald-400 to-emerald-600' },
    { label: 'To process', value: counts.pending, note: 'Waiting to ship', icon: Clock, tone: 'from-amber-400 to-amber-600' },
    { label: 'In transit', value: counts.shipped, note: `${counts.delivered} delivered`, icon: Truck, tone: 'from-violet-400 to-violet-600' },
  ];

  const tabs = [{ id: '', label: 'All', count: all.length }, ...DELIVERY_STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s], count: counts[s] }))];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Orders</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">Track payments and deliveries, open any order for the full picture.</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({
          label, value, note, icon: Icon, tone,
        }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4">
            <span className={cx('hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-[0_10px_20px_-12px_rgb(6_59_76/0.6)] sm:flex', tone)}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink-400">{label}</p>
              <p className="truncate text-[20px] font-bold leading-tight tracking-tight text-ink-900">{value}</p>
              <p className="truncate text-[12px] text-ink-400">{note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------- table card */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        {/* Filters are plain links so the page stays a server component and a
            filtered view can be bookmarked or shared. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:px-4">
          <nav className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 df-no-scrollbar" aria-label="Filter by delivery status">
            {tabs.map((t) => {
              const active = status === t.id;
              return (
                <Link
                  key={t.id || 'all'}
                  href={query({ status: t.id, page: '' })}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                    active ? 'bg-primary-500 text-white shadow-sm' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
                  )}
                >
                  {t.label}
                  <span className={cx('rounded-full px-1.5 py-px text-[11.5px] tabular-nums', active ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-400')}>
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <RangeSelect
              ranges={RANGES}
              value={range.id}
              basePath="/admin/orders"
              keep={{ status, q: search }}
            />
            <form action="/admin/orders" className="flex-1 sm:flex-none">
              {status ? <input type="hidden" name="status" value={status} /> : null}
              {rangeId !== 'all' ? <input type="hidden" name="range" value={rangeId} /> : null}
              <span className="relative block">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Order code, name, mobile"
                  aria-label="Search orders"
                  className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 sm:w-60"
                />
              </span>
            </form>
          </div>

          {search ? (
            <p className="flex w-full items-center gap-2 text-[13px] text-ink-500">
              {`Results for “${search}”`}
              <Link href={query({ q: '', page: '' })} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium text-primary-700 hover:bg-primary-50">
                <X size={13} aria-hidden="true" />
                Clear
              </Link>
            </p>
          ) : null}
        </div>

        {/* Phones get one card per order instead of a sideways-scrolling table. */}
        <ul className="divide-y divide-line md:hidden">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex gap-3 p-3.5 active:bg-surface-muted">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                  {o.items.find((i) => i.image) ? (
                    <SafeImage src={o.items.find((i) => i.image).image} alt="" fill sizes="56px" className="object-contain p-1" iconSize={18} />
                  ) : (
                    <span className="flex h-full items-center justify-center text-ink-300"><ShoppingBag size={18} aria-hidden="true" /></span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-primary-700">{o.code || o.id}</span>
                    <span className="text-[15px] font-semibold tabular-nums text-ink-900">{formatPrice(o.total)}</span>
                  </div>
                  <p className="truncate text-[13px] text-ink-700">
                    <span className="capitalize">{o.customer.name || "—"}</span>
                    <span className="text-ink-400">{` · ${o.itemCount} item${o.itemCount === 1 ? "" : "s"}`}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium", o.paid ? "bg-success/12 text-success" : "bg-surface-muted text-ink-500")}>
                      {o.paid ? "Paid" : "Due"}
                    </span>
                    <StatusPill status={o.delivery} />
                    <span className="ml-auto text-[12px] text-ink-400">{formatDate(o.placedAt)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {!orders.length ? <li className="px-4 py-12 text-center text-[14px] text-ink-400">No orders match this view.</li> : null}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-220 text-left text-[14px]">
            <thead className="bg-surface-muted/70 text-[12px] uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Order</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Placed</th>
                <th className="px-4 py-2.5 font-semibold">Payment</th>
                <th className="px-4 py-2.5 font-semibold">Delivery</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const thumbs = o.items.filter((i) => i.image).slice(0, 2);
                return (
                  <tr key={o.id} className="group transition-colors hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex w-16 shrink-0 -space-x-6">
                          {(thumbs.length ? thumbs : [null]).map((i, n) => (
                            <span key={n} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                              {i ? <SafeImage src={i.image} alt="" fill sizes="44px" className="object-contain p-1" iconSize={16} /> : (
                                <span className="flex h-full items-center justify-center text-ink-300"><ShoppingBag size={16} aria-hidden="true" /></span>
                              )}
                            </span>
                          ))}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary-700 hover:text-primary-800">
                            {o.code || o.id}
                          </Link>
                          <span className="block text-[12.5px] text-ink-400">
                            {`${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`}
                            {o.guestId ? ' · guest' : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-semibold text-primary-700">
                          {initials(o.customer.name)}
                        </span>
                        <div className="min-w-0">
                          {/* A signed-in buyer opens their profile; a guest has none. */}
                          {o.buyer && !o.guestId ? (
                            <Link href={`/admin/customers/${o.buyer}`} className="block truncate font-medium capitalize text-ink-900 hover:text-primary-700">
                              {o.customer.name || `Customer ${o.buyer}`}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium capitalize text-ink-900">{o.customer.name || '—'}</span>
                          )}
                          {o.customer.mobile ? (
                            <a href={`tel:${o.customer.mobile}`} className="block text-[12.5px] tabular-nums text-ink-400 hover:text-primary-700">
                              {o.customer.mobile}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="block text-ink-700">{formatDate(o.placedAt)}</span>
                      <span className="block text-[12.5px] text-ink-400">{timeOf(o.placedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cx(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium',
                        o.paid ? 'bg-success/12 text-success' : 'bg-surface-muted text-ink-500',
                      )}
                      >
                        <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', o.paid ? 'bg-success' : 'bg-ink-300')} />
                        {o.paid ? 'Paid' : 'Due'}
                      </span>
                      <span className="mt-1 block text-[12px] capitalize text-ink-400">
                        {o.paymentType === 'cash_on_delivery' ? 'Cash on delivery' : o.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={o.delivery} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-semibold tabular-nums text-ink-900">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:bg-primary-500 hover:text-white"
                      >
                        View detail
                        <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!orders.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <ShoppingBag size={28} className="mx-auto text-ink-300" aria-hidden="true" />
                    <p className="mt-2 font-medium text-ink-700">No orders match this view</p>
                    <p className="text-[13px] text-ink-400">Try another status, date range or search.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination
        {...view}
        params={{ status, q: search, range: rangeId === 'all' ? '' : rangeId }}
        label="orders"
      />
    </>
  );
}

import Link from 'next/link';
import { Package, Clock, Inbox, Phone, Mail, IndianRupee } from 'lucide-react';
import { getDashboard, listOrders } from '@/lib/sql/admin';
import { formatPrice, formatDate } from '@/lib/utils';
import StatusPill from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([getDashboard(), listOrders({ limit: 8 })]);

  const cards = [
    { label: 'Orders today', value: stats.ordersToday, icon: Package, href: '/admin/orders' },
    { label: 'Sales today', value: formatPrice(stats.salesToday), icon: IndianRupee, href: '/admin/orders' },
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

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-ink-900">Latest orders</h2>
        <Link href="/admin/orders" className="text-[14px] font-medium text-primary-700 hover:text-primary-800">
          View all
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-line bg-surface-muted text-[12.5px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Placed</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(recent || []).map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary-700 hover:text-primary-800">
                    {o.code || o.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {o.customer.name || '—'}
                  <span className="block text-[12.5px] text-ink-400">{o.customer.mobile}</span>
                </td>
                <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDate(o.placedAt)}</td>
                <td className="px-4 py-3"><StatusPill status={o.delivery} /></td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {!recent?.length ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-400">No orders yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

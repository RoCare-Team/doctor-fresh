import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Mail, MapPin, Phone, Heart, ShoppingBag, IndianRupee, Clock, ChevronRight,
} from 'lucide-react';
import { getCustomer } from '@/lib/sql/admin-catalog';
import AdminTable from '@/components/admin/AdminTable';
import StatusPill from '@/components/admin/StatusPill';
import { formatPrice, formatDate, cx } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customer' };

export default async function AdminCustomerPage({ params }) {
  await requirePage('customers');
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const stats = [
    { label: 'Orders', value: customer.orders.length, icon: ShoppingBag },
    { label: 'Paid', value: formatPrice(customer.spent), icon: IndianRupee },
    { label: 'Outstanding', value: formatPrice(customer.due), icon: Clock },
    { label: 'Wishlist', value: customer.wishlistCount, icon: Heart },
  ];

  return (
    <>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All customers
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">{customer.name}</h1>
          <p className="mt-1 text-[14px] text-ink-400">
            {customer.joined ? `Customer since ${formatDate(customer.joined)}` : 'Customer'}
            {customer.lastLogin ? ` · last signed in ${formatDate(customer.lastLogin)}` : ''}
          </p>
        </div>

        {customer.mobile ? (
          <a
            href={`tel:${customer.mobile}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ink-900"
          >
            <Phone size={15} aria-hidden="true" />
            Call {customer.mobile}
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13px] text-ink-400">{label}</span>
              <span className="block text-[19px] font-semibold text-ink-900">{value}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- contact */}
        <div className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-[15px] font-semibold text-ink-900">Contact</h2>
          <dl className="mt-3 space-y-3 text-[14px]">
            <div className="flex gap-2.5">
              <dt className="shrink-0 text-ink-300"><Phone size={15} aria-hidden="true" /></dt>
              <dd>
                {customer.mobile ? (
                  <a href={`tel:${customer.mobile}`} className="text-primary-700 hover:text-primary-800">
                    {customer.mobile}
                  </a>
                ) : <span className="text-ink-400">No mobile number</span>}
              </dd>
            </div>
            <div className="flex gap-2.5">
              <dt className="shrink-0 text-ink-300"><Mail size={15} aria-hidden="true" /></dt>
              <dd className="min-w-0 wrap-break-word">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-primary-700 hover:text-primary-800">
                    {customer.email}
                  </a>
                ) : <span className="text-ink-400">No email</span>}
              </dd>
            </div>
            <div className="flex gap-2.5">
              <dt className="shrink-0 text-ink-300"><MapPin size={15} aria-hidden="true" /></dt>
              <dd className="text-ink-700">
                {[customer.address, [customer.city, customer.state].filter(Boolean).join(', '), customer.zip]
                  .filter(Boolean).join(' · ') || <span className="text-ink-400">No address on the profile</span>}
              </dd>
            </div>
          </dl>
        </div>

        {/* ----------------------------------------------------------- orders */}
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Orders</h2>
          <AdminTable
            head={[
              { label: 'Order' },
              { label: 'Placed', hideSm: true },
              { label: 'Items', hideSm: true },
              { label: 'Payment' },
              { label: 'Delivery' },
              { label: 'Total', align: 'right' },
              { label: 'Detail', align: 'right' },
            ]}
            empty="This customer has not placed an order yet."
            minWidth={820}
          >
            {customer.orders.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary-700 hover:text-primary-800">
                    {o.code || o.id}
                  </Link>
                  <span className="block text-[12px] text-ink-300">
                    {o.paymentType === 'cash_on_delivery' ? 'COD' : o.paymentType}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDate(o.placedAt)}</td>
                <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{o.itemCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium',
                      o.paid ? 'bg-success/12 text-success' : 'bg-surface-muted text-ink-500',
                    )}
                  >
                    {o.paid ? 'Paid' : 'Due'}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusPill status={o.delivery} /></td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">{formatPrice(o.total)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
                  >
                    View detail
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
      </div>
    </>
  );
}

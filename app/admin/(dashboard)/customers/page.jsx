import Link from 'next/link';
import { Users, UserPlus, ShoppingBag, Wallet } from 'lucide-react';
import { listCustomers, customerStats } from '@/lib/sql/admin-catalog';
import StatCards from '@/components/admin/StatCards';
import ListTools from '@/components/admin/ListTools';
import { cx } from '@/lib/utils';
import Pagination, { paginate } from '@/components/admin/Pagination';
import AdminTable from '@/components/admin/AdminTable';
import SearchBox from '@/components/admin/SearchBox';
import { formatPrice, formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers' };

export default async function AdminCustomersPage({ searchParams }) {
  await requirePage('customers');
  const params = await searchParams;
  const search = (params?.q || '').trim();
  const show = ['buyers', 'none', 'new'].includes(params?.show) ? params.show : '';
  const page = Number(params?.page) || 1;
  const [rows, stats] = await Promise.all([
    listCustomers({ search, limit: 1000 }),
    // The whole shop, not this page: a search finds a person, it does not
    // change how many customers there are.
    customerStats().catch(() => null),
  ]);
  // The filters answer the three questions actually asked of this list: who
  // buys, who has signed up but never bought, and who is new.
  const monthAgo = Date.now() - 30 * 86400 * 1000;
  const matches = (c) => (
    show === 'buyers' ? c.orders > 0
      : show === 'none' ? !c.orders
        : show === 'new' ? Date.parse(c.joined || 0) >= monthAgo
          : true
  );
  const filtered = (rows || []).filter(matches);
  const view = paginate(filtered, page);
  const customers = view.rows;

  const link = (patch) => {
    const p = new URLSearchParams();
    Object.entries({ q: search, show, ...patch }).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString() ? `/admin/customers?${p}` : '/admin/customers';
  };

  const tabs = [
    { id: '', label: 'All', count: (rows || []).length },
    { id: 'buyers', label: 'With orders', count: (rows || []).filter((c) => c.orders > 0).length },
    { id: 'none', label: 'No orders yet', count: (rows || []).filter((c) => !c.orders).length },
    { id: 'new', label: 'New (30 days)', count: (rows || []).filter((c) => Date.parse(c.joined || 0) >= monthAgo).length },
  ];

  const exportColumns = [
    { label: 'Name', key: 'name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Email', key: 'email' },
    { label: 'City', key: 'city' },
    { label: 'Joined', key: 'joinedOn' },
    { label: 'Orders', key: 'orders' },
    { label: 'Spent', key: 'spent' },
  ];
  const exportRows = filtered.map((c) => ({ ...c, joinedOn: c.joined ? formatDate(c.joined) : '' }));

  const cards = stats ? [
    {
      id: 'total', label: 'Total Customers', value: stats.total.toLocaleString('en-IN'),
      icon: Users, tone: 'primary', href: link({ show: '', page: '' }), active: !show,
    },
    {
      id: 'fresh', label: 'New', value: stats.fresh.toLocaleString('en-IN'),
      note: 'joined in 30 days', icon: UserPlus, tone: 'blue',
      href: link({ show: 'new', page: '' }), active: show === 'new',
    },
    {
      id: 'buyers', label: 'With Orders', value: stats.buyers.toLocaleString('en-IN'),
      note: `${stats.total ? Math.round((stats.buyers / stats.total) * 100) : 0}% of customers`,
      icon: ShoppingBag, tone: 'amber',
      href: link({ show: 'buyers', page: '' }), active: show === 'buyers',
    },
    {
      id: 'paid', label: 'Paid Sales', value: formatPrice(stats.paid),
      note: 'collected from paid orders', icon: Wallet, tone: 'green',
    },
  ] : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Customers</h1>
        <SearchBox action="/admin/customers" placeholder="Name, mobile or email" defaultValue={search} />
      </div>

      <StatCards cards={cards} className="mt-4" />

      {/* Which customers to list, and the list itself as a spreadsheet. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2.5">
        <nav className="flex flex-wrap gap-1" aria-label="Filter customers">
          {tabs.map((t) => (
            <Link
              key={t.id || 'all'}
              href={link({ show: t.id, page: '' })}
              aria-current={show === t.id ? 'page' : undefined}
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                show === t.id ? 'bg-primary-500 text-white' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
              )}
            >
              {t.label}
              <span className={cx('rounded-full px-1.5 text-[11.5px] tabular-nums', show === t.id ? 'bg-white/20' : 'bg-surface-muted text-ink-400')}>
                {t.count}
              </span>
            </Link>
          ))}
        </nav>
        <span className="ml-auto">
          <ListTools rows={exportRows} columns={exportColumns} filename="customers" />
        </span>
      </div>

      <div className="mt-4" />

      <AdminTable
        head={[
          { label: 'Customer' },
          { label: 'Mobile' },
          { label: 'City', hideSm: true },
          { label: 'Joined', hideSm: true },
          { label: 'Orders' },
          { label: 'Spent', align: 'right' },
        ]}
        empty="No customers match this search."
        minWidth={760}
      >
        {(customers || []).map((c) => (
          <tr key={c.id} className="transition-colors hover:bg-surface-muted">
            <td className="px-4 py-3">
              <Link
                href={`/admin/customers/${c.id}`}
                className="font-medium text-primary-700 hover:text-primary-800"
              >
                {c.name}
              </Link>
              {c.email ? <span className="block text-[12.5px] text-ink-400">{c.email}</span> : null}
            </td>
            <td className="px-4 py-3">
              <a href={`tel:${c.mobile}`} className="text-primary-700 hover:text-primary-800">{c.mobile || '—'}</a>
            </td>
            <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{c.city || '—'}</td>
            <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{c.joined ? formatDate(c.joined) : '—'}</td>
            <td className="px-4 py-3 text-ink-700">{c.orders}</td>
            <td className="px-4 py-3 text-right font-medium text-ink-900">{c.spent ? formatPrice(c.spent) : '—'}</td>
          </tr>
        ))}
      </AdminTable>

      <Pagination {...view} params={{ q: search, show }} label="customers" />
    </>
  );
}

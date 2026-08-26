import { listCustomers } from '@/lib/sql/admin-catalog';
import AdminTable from '@/components/admin/AdminTable';
import SearchBox from '@/components/admin/SearchBox';
import { formatPrice, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers' };

export default async function AdminCustomersPage({ searchParams }) {
  const params = await searchParams;
  const search = (params?.q || '').trim();
  const customers = await listCustomers({ search, limit: 300 });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Customers</h1>
        <SearchBox action="/admin/customers" placeholder="Name, mobile or email" defaultValue={search} />
      </div>

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
              <span className="font-medium text-ink-900">{c.name}</span>
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
    </>
  );
}

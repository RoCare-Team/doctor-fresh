import { listCoupons } from '@/lib/sql/admin-catalog';
import Pagination, { paginate } from '@/components/admin/Pagination';
import AdminTable from '@/components/admin/AdminTable';
import CouponForm from '@/components/admin/CouponForm';
import CouponDelete from '@/components/admin/CouponDelete';
import { formatDate, formatPrice, cx } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coupons' };

export default async function AdminCouponsPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;

  const all = await listCoupons({ limit: 500 }) || [];
  const live = all.filter((c) => !c.expired).length;

  const view = paginate(all, page);
  const coupons = view.rows;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Coupons</h1>
        <span className="text-[14px] text-ink-400">
          {live} active · {coupons?.length ?? 0} total
        </span>
      </div>

      <div className="mt-5 max-w-2xl">
        <CouponForm />
      </div>

      <AdminTable
        head={[
          { label: 'Code' },
          { label: 'Discount' },
          { label: 'Valid till' },
          { label: 'Status' },
          { label: '', align: 'right' },
        ]}
        empty="No coupons yet."
        minWidth={640}
      >
        {(coupons || []).map((c) => (
          <tr key={c.id} className={cx('transition-colors hover:bg-surface-muted', c.expired && 'opacity-60')}>
            <td className="px-4 py-3">
              <span className="font-mono font-medium text-ink-900">{c.code}</span>
              {c.title ? <span className="block text-[12.5px] text-ink-400">{c.title}</span> : null}
            </td>
            <td className="px-4 py-3 text-ink-700">
              {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
            </td>
            <td className="px-4 py-3 text-ink-500">{c.till ? formatDate(c.till) : '—'}</td>
            <td className="px-4 py-3">
              <span
                className={cx(
                  'rounded-full px-2.5 py-1 text-[12.5px] font-medium',
                  c.expired ? 'bg-surface-muted text-ink-400' : 'bg-success/12 text-success',
                )}
              >
                {c.expired ? 'Expired' : 'Active'}
              </span>
            </td>
            <td className="px-4 py-3 text-right"><CouponDelete id={c.id} code={c.code} /></td>
          </tr>
        ))}
      </AdminTable>

      <Pagination {...view} label="coupons" />
    </>
  );
}

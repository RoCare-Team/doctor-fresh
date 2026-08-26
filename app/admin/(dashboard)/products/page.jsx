import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listProducts, listCategories } from '@/lib/sql/admin-catalog';
import AdminTable from '@/components/admin/AdminTable';
import SearchBox from '@/components/admin/SearchBox';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice, cx } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products' };

export default async function AdminProductsPage({ searchParams }) {
  const params = await searchParams;
  const search = (params?.q || '').trim();
  const categoryId = params?.category || '';

  const [products, categories] = await Promise.all([
    listProducts({ search, categoryId, limit: 400 }),
    listCategories(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Products</h1>
        <span className="flex items-center gap-4">
          <span className="text-[14px] text-ink-400">{products?.length ?? 0} shown</span>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-primary-900"
          >
            <Plus size={16} aria-hidden="true" />
            Add product
          </Link>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/products"
          className={cx(
            'rounded-lg border px-3 py-1.5 text-[13.5px] transition-colors',
            !categoryId ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
          )}
        >
          All
        </Link>
        {(categories || []).map((c) => (
          <Link
            key={c.id}
            href={`/admin/products?category=${c.id}`}
            className={cx(
              'rounded-lg border px-3 py-1.5 text-[13.5px] transition-colors',
              String(categoryId) === String(c.id) ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
            )}
          >
            {c.name}
            <span className="ml-1.5 text-[12px] opacity-60">{c.products}</span>
          </Link>
        ))}

        <div className="ml-auto">
          <SearchBox action="/admin/products" placeholder="Name, slug or id" defaultValue={search} hidden={{ category: categoryId }} />
        </div>
      </div>

      <AdminTable
        head={[
          { label: 'Product' },
          { label: 'Category', hideSm: true },
          { label: 'Price' },
          { label: 'Stock' },
          { label: 'Flags' },
          { label: '', align: 'right' },
        ]}
        empty="No products match this view."
        minWidth={860}
      >
        {(products || []).map((p) => (
          <tr key={p.id} className="transition-colors hover:bg-surface-muted">
            <td className="px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-line">
                  <SafeImage src={p.image} fill sizes="40px" className="object-contain p-0.5" iconSize={14} />
                </span>
                <span className="min-w-0">
                  <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium text-primary-700 hover:text-primary-800">
                    {p.name}
                  </Link>
                  <span className="block text-[12px] text-ink-300">#{p.id}</span>
                </span>
              </span>
            </td>
            <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{p.categoryName || '—'}</td>
            <td className="px-4 py-3">
              <span className="font-medium text-ink-900">{p.price ? formatPrice(p.price) : 'On request'}</span>
              {p.discount > 0 ? (
                <span className="block text-[12px] text-ink-400 line-through">{formatPrice(p.salePrice)}</span>
              ) : null}
            </td>
            <td className={cx('px-4 py-3', p.stock > 0 ? 'text-ink-500' : 'text-danger')}>{p.stock}</td>
            <td className="px-4 py-3">
              <span className="flex flex-wrap gap-1">
                {!p.live ? <Flag tone="muted">Hidden</Flag> : null}
                {p.featured ? <Flag tone="primary">Featured</Flag> : null}
                {p.deal ? <Flag tone="success">Deal</Flag> : null}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <Link href={`/admin/products/${p.id}`} className="text-[13.5px] font-medium text-primary-700 hover:text-primary-800">
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}

function Flag({ tone, children }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-800',
    success: 'bg-success/12 text-success',
    muted: 'bg-surface-muted text-ink-400',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-medium ${tones[tone]}`}>{children}</span>
  );
}

import Link from 'next/link';
import Pagination, { paginate } from '@/components/admin/Pagination';
import {
  Plus, Pencil, Eye, Tag, Boxes, PackageX,
} from 'lucide-react';
import { listProducts, listCategories, listProductBrands } from '@/lib/sql/admin-catalog';
import ProductFilters from '@/components/admin/ProductFilters';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice, cx } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';
import { Can } from '@/components/admin/AdminAccess';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products' };

export default async function AdminProductsPage({ searchParams }) {
  await requirePage('products');
  const params = await searchParams;
  const values = {
    q: (params?.q || '').trim(),
    category: params?.category || '',
    brand: params?.brand || '',
    min: params?.min || '',
    max: params?.max || '',
  };
  const page = Number(params?.page) || 1;

  const [allProducts, categories, brands] = await Promise.all([
    listProducts({
      search: values.q,
      categoryId: values.category,
      brandId: values.brand,
      minPrice: values.min,
      maxPrice: values.max,
      limit: 2000,
    }),
    listCategories(),
    listProductBrands(),
  ]);

  const view = paginate(allProducts || [], page);
  const products = view.rows;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Products</h1>
          <p className="mt-0.5 text-[14px] text-ink-400">
            {'Showing '}
            <span className="font-semibold text-primary-700">{view.total}</span>
            {` product${view.total === 1 ? '' : 's'}`}
          </p>
        </div>
        <Can section="products" action="create">
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ink-900"
        >
          <Plus size={16} aria-hidden="true" />
          Add product
        </Link>
        </Can>
      </div>

      <div className="mt-4">
        <ProductFilters categories={categories || []} brands={brands || []} values={values} />
      </div>

      {products.length ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
          <PackageX size={28} className="mx-auto text-ink-300" aria-hidden="true" />
          <p className="mt-3 text-[15px] font-medium text-ink-700">No products match these filters</p>
          <p className="mt-1 text-[13.5px] text-ink-400">Try a wider price range or clear a filter.</p>
        </div>
      )}

      <Pagination
        {...view}
        params={{
          q: values.q, category: values.category, brand: values.brand, min: values.min, max: values.max,
        }}
        label="products"
      />
    </>
  );
}

function ProductCard({ product: p }) {
  const inStock = p.stock > 0;
  const hasDiscount = p.discount > 0 && p.salePrice > p.price;

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_16px_32px_-22px_rgb(6_59_76/0.45)]">
      {/* ---------------------------------------------------------- photo */}
      <div className="relative aspect-4/3 bg-white">
        <SafeImage
          src={p.image}
          fill
          sizes="(max-width: 640px) 90vw, 320px"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
          iconSize={30}
        />

        <span
          className={cx(
            'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
            inStock ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger',
          )}
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', inStock ? 'bg-success' : 'bg-danger')} />
          {inStock ? 'In Stock' : 'Out of Stock'}
        </span>

        {/* What the shop cannot see from the photo: hidden, featured, on deal. */}
        <span className="absolute right-3 top-3 flex flex-col items-end gap-1">
          {!p.live ? <Flag className="bg-ink-900/80 text-white">Hidden</Flag> : null}
          {p.featured ? <Flag className="bg-primary-500 text-white">Featured</Flag> : null}
          {p.deal ? <Flag className="bg-warning text-white">Deal</Flag> : null}
        </span>
      </div>

      {/* --------------------------------------------------------- details */}
      <div className="flex flex-1 flex-col border-t border-line p-4">
        <Link
          href={`/admin/products/${p.id}`}
          className="line-clamp-2 min-h-11 text-[15.5px] font-semibold leading-snug text-ink-900 transition-colors hover:text-primary-700"
          title={p.name}
        >
          {p.name}
        </Link>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.categoryName ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/5 px-2 py-0.5 text-[12px] font-medium text-success">
              <Tag size={12} aria-hidden="true" />
              {p.categoryName}
            </span>
          ) : null}
          {p.brandName ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-[12px] font-medium text-primary-700">
              <Boxes size={12} aria-hidden="true" />
              {p.brandName}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[22px] font-bold tracking-tight text-ink-900">
            {p.price ? formatPrice(p.price) : 'On request'}
          </span>
          {hasDiscount ? (
            <span className="text-[13.5px] text-ink-300 line-through">{formatPrice(p.salePrice)}</span>
          ) : null}
        </div>

        <p className={cx('mt-1 flex items-center gap-1.5 text-[13px] font-medium', inStock ? 'text-success' : 'text-danger')}>
          <span className={cx('h-1.5 w-1.5 rounded-full', inStock ? 'bg-success' : 'bg-danger')} />
          {`In Stock: ${p.stock}`}
          <span className="ml-auto text-[12px] font-normal text-ink-300">{`#${p.id}`}</span>
        </p>

        {/* ---------------------------------------------------- actions */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link
            href={`/admin/products/${p.id}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-warning text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Pencil size={15} aria-hidden="true" />
            Edit
          </Link>
          <a
            href={`/product/${p.slug}/${p.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-500 text-[14px] font-semibold text-white transition-colors hover:bg-ink-900"
          >
            <Eye size={15} aria-hidden="true" />
            View
          </a>
        </div>
      </div>
    </li>
  );
}

function Flag({ className, children }) {
  return (
    <span className={cx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold shadow-sm', className)}>
      {children}
    </span>
  );
}

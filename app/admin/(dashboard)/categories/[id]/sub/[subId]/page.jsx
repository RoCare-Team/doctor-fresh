import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Package } from 'lucide-react';
import { getSubcategoryPage } from '@/lib/sql/admin-catalog';
import CategoryEditor from '@/components/admin/CategoryEditor';
import DeleteCategory from '@/components/admin/DeleteCategory';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit subcategory' };

export default async function AdminSubcategoryPage({ params }) {
  await requirePage('categories');
  const { id, subId } = await params;
  const sub = await getSubcategoryPage(Number(subId));
  // A subcategory opened under the wrong parent is sent nowhere rather than
  // edited under a misleading heading.
  if (!sub || sub.categoryId !== Number(id)) notFound();

  const href = `/category/${sub.categorySlug}/${sub.slug}`;
  const banner = sub.banner && fs.existsSync(path.join(process.cwd(), 'public', sub.banner)) ? sub.banner : '';

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/admin/categories/${sub.categoryId}`}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {sub.categoryName || 'Back to category'}
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex min-w-0 items-center gap-3">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-line bg-white object-contain p-1" />
          ) : null}
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-primary-700">Subcategory</p>
            <h1 className="truncate text-[22px] font-semibold text-ink-900">{sub.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-ink-400">
              <span className="break-all">{href}</span>
              <span className="inline-flex items-center gap-1">
                <Package size={13} aria-hidden="true" />
                {`${sub.products} products`}
              </span>
            </p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          View on site
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <CategoryEditor category={sub} kind="subcategory" path={href} />

      <DeleteCategory
        kind="subcategory"
        id={sub.id}
        name={sub.name}
        path={href}
        redirectDefault={`/category/${sub.categorySlug}`}
        afterHref={`/admin/categories/${sub.categoryId}`}
        blocked={sub.products ? `It has ${sub.products} products — move them to another subcategory before deleting it.` : ''}
      />
    </div>
  );
}

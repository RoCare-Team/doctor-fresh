import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Package } from 'lucide-react';
import { getCategory } from '@/lib/sql/admin-catalog';
import CategoryEditor from '@/components/admin/CategoryEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit category' };

export default async function AdminCategoryPage({ params }) {
  const { id } = await params;
  const category = await getCategory(Number(id));
  if (!category) notFound();

  // The banner column often names a file that was never copied to this app;
  // a missing picture is left out rather than shown broken.
  const banner = category.banner && fs.existsSync(path.join(process.cwd(), 'public', category.banner))
    ? category.banner
    : '';

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All categories
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex min-w-0 items-center gap-3">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-line bg-white object-contain p-1" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold text-ink-900">{category.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-ink-400">
              <span>{`/category/${category.slug}`}</span>
              <span className="inline-flex items-center gap-1">
                <Package size={13} aria-hidden="true" />
                {`${category.products} products`}
              </span>
            </p>
          </div>
        </div>
        <a
          href={`/category/${category.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          View on site
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <CategoryEditor category={category} />
    </div>
  );
}

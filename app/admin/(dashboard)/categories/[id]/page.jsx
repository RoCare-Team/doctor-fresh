import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, ExternalLink, Package, Pencil, FolderTree, CircleAlert, CircleCheck,
} from 'lucide-react';
import { getCategory, listSubcategoryPages } from '@/lib/sql/admin-catalog';
import CategoryEditor from '@/components/admin/CategoryEditor';
import NewCategoryButton from '@/components/admin/NewCategoryButton';
import DeleteCategory from '@/components/admin/DeleteCategory';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit category' };

export default async function AdminCategoryPage({ params }) {
  const { id } = await params;
  const [category, allSubs] = await Promise.all([getCategory(Number(id)), listSubcategoryPages()]);
  if (!category) notFound();
  const subs = (allSubs || []).filter((s) => s.categoryId === Number(category.id));

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

      {/* Each subcategory is its own page on the site (/category/parent/child)
          with its own listing, heading, content and FAQ. */}
      <section className="mb-5 rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <FolderTree size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-ink-900">{`Subcategories (${subs.length})`}</h2>
              <p className="mt-0.5 text-[13px] text-ink-400">Each one has its own page — edit its search listing, heading, content and FAQs.</p>
            </div>
            <div className="ml-auto">
              <NewCategoryButton
                kind="subcategory"
                variant="secondary"
                label="Add subcategory"
                parent={{ id: category.id, name: category.name, slug: category.slug }}
              />
            </div>
          </div>
          {!subs.length ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13.5px] text-ink-400">
              No subcategories yet.
            </p>
          ) : null}
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {subs.map((s) => {
              const ready = s.metaTitle && s.metaDescription;
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/categories/${category.id}/sub/${s.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink-900 group-hover:text-primary-700">{s.name}</p>
                      <p className="truncate text-[12.5px] text-ink-400">{`/${category.slug}/${s.slug}`}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-ink-500">{`${s.products} products`}</span>
                        {ready ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success">
                            <CircleCheck size={11} aria-hidden="true" />
                            SEO set
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 font-medium text-warning">
                            <CircleAlert size={11} aria-hidden="true" />
                            {s.metaTitle ? 'No description' : 'No meta title'}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-white">
                      <Pencil size={13} aria-hidden="true" />
                      Edit
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
      </section>

      <CategoryEditor category={category} />

      <DeleteCategory
        id={category.id}
        name={category.name}
        path={`/category/${category.slug}`}
        blocked={
          category.products
            ? `It has ${category.products} products — move them to another category before deleting it.`
            : subs.length
              ? `It has ${subs.length} subcategories — delete those first.`
              : ''
        }
      />
    </div>
  );
}

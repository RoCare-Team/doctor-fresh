import Link from 'next/link';
import {
  Layers, Package, CircleCheck, CircleAlert, Pencil, ExternalLink, Search,
} from 'lucide-react';
import { listCategories, listSubcategoryPages } from '@/lib/sql/admin-catalog';
import SafeImage from '@/components/common/SafeImage';
import NewCategoryButton from '@/components/admin/NewCategoryButton';
import { cx } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories' };

/** What a category's search listing is missing, in the order worth fixing. */
function seoGaps(c) {
  const gaps = [];
  if (!c.metaTitle) gaps.push('No meta title');
  else if (c.metaTitle.length > 70) gaps.push('Meta title too long');
  if (!c.metaDescription) gaps.push('No meta description');
  else if (c.metaDescription.length > 170) gaps.push('Description too long');
  return gaps;
}

export default async function AdminCategoriesPage({ searchParams }) {
  await requirePage('categories');
  const params = await searchParams;
  const search = (params?.q || '').trim().toLowerCase();
  const [cats, subList] = await Promise.all([listCategories(), listSubcategoryPages()]);
  const all = cats || [];
  const subsOf = new Map();
  for (const sc of subList || []) {
    if (!subsOf.has(sc.categoryId)) subsOf.set(sc.categoryId, []);
    subsOf.get(sc.categoryId).push(sc);
  }
  const categories = search
    ? all.filter((c) => [c.name, c.slug, ...(subsOf.get(Number(c.id)) || []).flatMap((sc) => [sc.name, sc.slug])]
      .join(' ').toLowerCase().includes(search))
    : all;

  const totalProducts = all.reduce((n, c) => n + c.products, 0);
  const needsSeo = all.filter((c) => seoGaps(c).length).length;

  const stats = [
    { label: 'Categories', value: all.length, icon: Layers, tone: 'from-primary-400 to-primary-700' },
    { label: 'Products', value: totalProducts, icon: Package, tone: 'from-violet-400 to-violet-600' },
    { label: 'SEO complete', value: all.length - needsSeo, icon: CircleCheck, tone: 'from-emerald-400 to-emerald-600' },
    { label: 'Need SEO work', value: needsSeo, icon: CircleAlert, tone: 'from-amber-400 to-amber-600' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Categories</h1>
          <p className="mt-0.5 max-w-2xl text-[13.5px] text-ink-400">
            Create categories and subcategories, and edit each page's search listing, heading, content and FAQs.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <form action="/admin/categories" className="min-w-0 flex-1 sm:w-60 sm:flex-none">
          <span className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              name="q"
              defaultValue={params?.q || ''}
              placeholder="Search categories"
              aria-label="Search categories"
              className="h-10 w-full rounded-xl border border-line-strong bg-white pl-9 pr-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
            />
          </span>
        </form>
          <NewCategoryButton
            kind="subcategory"
            variant="secondary"
            categories={all.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          />
          <NewCategoryButton />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({
          label, value, icon: Icon, tone,
        }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4">
            <span className={cx('hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-[0_10px_20px_-12px_rgb(6_59_76/0.6)] sm:flex', tone)}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-ink-400">{label}</p>
              <p className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {search ? (
        <p className="mt-4 text-[13.5px] text-ink-500">
          {`${categories.length} result${categories.length === 1 ? '' : 's'} for “${params.q}” · `}
          <Link href="/admin/categories" className="font-medium text-primary-700 hover:underline">Clear</Link>
        </p>
      ) : null}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => {
          const gaps = seoGaps(c);
          const href = `/admin/categories/${c.id}`;
          return (
            <li key={c.id} className="group flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_18px_36px_-26px_rgb(6_59_76/0.55)]">
              <div className="flex gap-3.5">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-muted">
                  {c.image ? (
                    <SafeImage src={c.image} alt="" fill sizes="64px" className="object-contain p-1.5" iconSize={20} />
                  ) : (
                    <span className="flex h-full items-center justify-center text-primary-300"><Layers size={22} aria-hidden="true" /></span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={href} className="truncate text-[16px] font-semibold text-ink-900 hover:text-primary-700">
                      {c.name}
                    </Link>
                    <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-primary-700">
                      {`${c.products} product${c.products === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <a
                    href={`/category/${c.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[13px] text-ink-400 hover:text-primary-700"
                  >
                    <span className="truncate">{`/${c.slug}`}</span>
                    <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <p className={cx('mt-3 line-clamp-2 min-h-[2.6em] text-[12.5px] leading-[1.3]', c.metaTitle ? 'text-ink-500' : 'italic text-ink-300')}>
                {c.metaTitle || 'No meta title yet'}
              </p>

              {subsOf.get(Number(c.id))?.length ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {subsOf.get(Number(c.id)).slice(0, 3).map((sc) => (
                    <Link
                      key={sc.id}
                      href={`/admin/categories/${c.id}/sub/${sc.id}`}
                      title={`Edit ${sc.name}`}
                      className="max-w-full truncate rounded-full border border-line bg-surface-muted/60 px-2.5 py-0.5 text-[12px] font-medium text-ink-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {sc.name}
                    </Link>
                  ))}
                  {subsOf.get(Number(c.id)).length > 3 ? (
                    <Link href={href} className="rounded-full px-2 py-0.5 text-[12px] font-medium text-primary-700 hover:bg-primary-50">
                      {`+${subsOf.get(Number(c.id)).length - 3} more`}
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {/* pushes the footer down so every card in a row lines up */}
              <span aria-hidden="true" className="flex-1" />
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                {gaps.length ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-[12px] font-medium text-warning">
                    <CircleAlert size={13} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{gaps.length > 1 ? `${gaps[0]} +${gaps.length - 1}` : gaps[0]}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[12px] font-medium text-success">
                    <CircleCheck size={13} aria-hidden="true" />
                    SEO ready
                  </span>
                )}
                <Link
                  href={href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:bg-primary-500 hover:text-white"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {!categories.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-white px-4 py-14 text-center">
          <Layers size={28} className="mx-auto text-ink-300" aria-hidden="true" />
          <p className="mt-2 font-medium text-ink-700">No categories found</p>
        </div>
      ) : null}
    </>
  );
}

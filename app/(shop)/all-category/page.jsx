import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { getAllCategories, getProductsByCategory, getCategoryImage } from '@/lib/catalog';
import { metaFor, imageUrl } from '@/lib/utils';

// A saved edit drops this page at once — the admin purges it by tag — so the
// timer only covers changes made straight in the PHP panel, which nothing
// here can know about. Fifteen minutes rather than five: every expiry means a
// page rebuilt from the database in Singapore, and that wait is what a visitor
// feels as a slow first byte.
export const revalidate = 900;

export const metadata = metaFor({
  title: 'All product categories',
  description:
    'Browse every Doctor Fresh category — water purifiers, RO plants, softeners, ionizers, water ATMs, STP/ETP, spare parts and more.',
  path: '/all-category',
});

export default async function AllCategoryPage() {
  const categories = await getAllCategories();

  /*
   * Counts and photographs are resolved up front so the JSX below stays a
   * plain render. The photograph is the first product shot of the category —
   * the stored category icons are 62×53px, far too small for a card.
   */
  const cards = await Promise.all(categories.map(async (c) => ({
    ...c,
    count: (await getProductsByCategory(c.slug)).length,
    image: await getCategoryImage(c.href).catch(() => null),
  })));

  const totalProducts = cards.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="df-container py-3">
          <Breadcrumb items={[{ name: 'Products', href: '/all-category' }]} />
        </div>
      </div>

      <div className="df-container py-4 md:py-5">
        {/* The heading and what the page holds share one line, the count
            pushed to the far side so the two read as a header bar. */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-primary-700 ring-1 ring-primary-100">
            <LayoutGrid size={12} aria-hidden="true" />
            The full range
          </span>

          <h1 className="mt-2.5 text-[26px] font-semibold tracking-[-0.02em] text-ink-900 md:text-[32px]">
            All products
          </h1>
          </div>

          {/* what the page actually holds, so the heading is not a claim */}
          <p className="pb-1.5 text-[13.5px] text-ink-500">
            <span className="font-semibold text-ink-900">{cards.length}</span> categories
            <span className="mx-2 text-ink-200">·</span>
            <span className="font-semibold text-ink-900">{totalProducts}</span> products
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <section
              key={c.slug}
              className="group flex flex-col rounded-[4px] bg-white shadow-[0_0_0_1.5px_rgb(15_23_42/0.12),0_6px_18px_-10px_rgb(15_23_42/0.14)] transition-shadow hover:shadow-[0_0_0_1.5px_rgb(15_23_42/0.18),0_14px_30px_-14px_rgb(15_23_42/0.22)]"
            >
              {/* ------------------------------------------- the category */}
              <Link href={c.href} className="flex items-center gap-3.5 border-b border-line p-4">
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#fbfcfd]">
                  {c.image ? (
                    <Image
                      src={imageUrl(c.image)}
                      alt={c.name}
                      title={c.name}
                      fill
                      sizes="64px"
                      className="object-contain p-1.5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-tight tracking-[-0.01em] text-ink-900 transition-colors group-hover:text-primary-700">
                    {c.name}
                  </span>
                  {c.count ? (
                    <span className="mt-1 block text-[13px] text-ink-400">{c.count} products</span>
                  ) : null}
                </span>

                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600"
                />
              </Link>

              {/* ---------------------------------------- what is inside it */}
              <div className="flex flex-1 flex-col p-4">
                {c.subcategories.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {c.subcategories.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className="inline-block rounded-full border border-line bg-white px-2.5 py-1 text-[12.5px] text-ink-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-ink-400">Everything in this range, on one page.</p>
                )}

                <Link
                  href={c.href}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-primary-700 transition-colors hover:text-primary-800"
                >
                  Browse {c.name}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

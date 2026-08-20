import Link from 'next/link';
import Breadcrumb from '@/components/common/Breadcrumb';
import { getAllCategories, getProductsByCategory } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'All product categories',
  description:
    'Browse every Doctor Fresh category — water purifiers, RO plants, softeners, ionizers, water ATMs, STP/ETP, spare parts and more.',
  path: '/all-category',
});

export default function AllCategoryPage() {
  const categories = getAllCategories();

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Products', href: '/all-category' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">All products</h1>
        <p className="mt-2.5 max-w-2xl text-[15.5px] leading-relaxed text-ink-400">
          Complete water treatment range for homes, offices, hospitals, hotels and industry.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const count = getProductsByCategory(c.slug).length;
          return (
            <section key={c.slug} className="df-card p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-ink-900">
                  <Link href={c.href} className="transition-colors hover:text-primary-800">
                    {c.name}
                  </Link>
                </h2>
                {count ? <span className="text-[13px] text-ink-300">{count} products</span> : null}
              </div>

              {c.subcategories.length ? (
                <ul className="space-y-1">
                  {c.subcategories.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        className="block rounded px-2 py-1 text-[14px] text-ink-500 transition-colors hover:bg-surface-muted hover:text-primary-800"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link href={c.href} className="text-[14px] text-primary-700 hover:text-primary-800">
                  Browse {c.name} →
                </Link>
              )}
            </section>
          );
        })}
      </div>
      </div>
    </>
  );
}

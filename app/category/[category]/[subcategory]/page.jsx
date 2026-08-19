import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getAllCategories, getSubcategory, getProductsBySubcategory, getProductsByIds } from '@/lib/catalog';
import { metaFor, cx } from '@/lib/utils';

export function generateStaticParams() {
  return getAllCategories().flatMap((c) =>
    c.subcategories.map((s) => ({ category: c.slug, subcategory: s.slug })),
  );
}

export async function generateMetadata({ params }) {
  const { category, subcategory } = await params;
  const found = getSubcategory(category, subcategory);
  if (!found) return {};

  return metaFor({
    title: found.subcategory.metaTitle || `${found.subcategory.name} - Doctor Fresh`,
    description: found.subcategory.metaDescription,
    path: found.subcategory.href,
  });
}

export default async function SubcategoryPage({ params }) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const found = getSubcategory(categorySlug, subcategorySlug);
  if (!found) notFound();

  const { category, subcategory } = found;
  const listed = getProductsByIds(subcategory.productIds);
  const owned = getProductsBySubcategory(category.slug, subcategory.slug);
  const seen = new Set();
  const products = [...owned, ...listed].filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb
        items={[
          { name: 'Products', href: '/all-category' },
          { name: category.name, href: category.href },
          { name: subcategory.name, href: subcategory.href },
        ]}
      />

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">
          {subcategory.heading || subcategory.name}
        </h1>
        {subcategory.intro ? (
          <p className="mt-2.5 max-w-3xl text-[15.5px] leading-relaxed text-ink-400">{subcategory.intro}</p>
        ) : null}
      </header>

      {category.subcategories.length > 1 ? (
        <nav aria-label="Subcategories" className="mb-7">
          <ul className="df-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
            {category.subcategories.map((s) => {
              const isActive = s.slug === subcategory.slug;
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      'inline-block whitespace-nowrap rounded-md border px-3.5 py-2 text-[14px] transition-colors',
                      isActive
                        ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                        : 'border-line bg-white text-ink-500 hover:border-primary-300 hover:text-primary-800',
                    )}
                  >
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <CategoryProducts products={products} />

      <div className="mt-12 space-y-10">
        <SeoContent sections={subcategory.seoSections} />
        <FaqSection faqs={subcategory.faqs} />
      </div>
    </div>
  );
}

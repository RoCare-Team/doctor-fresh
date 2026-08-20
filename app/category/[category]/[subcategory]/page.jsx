import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
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
    <>
      <PageHeader
        breadcrumb={[
          { name: 'Products', href: '/all-category' },
          { name: category.name, href: category.href },
          { name: subcategory.name, href: subcategory.href },
        ]}
        eyebrow={category.name}
        title={subcategory.heading || subcategory.name}
        lead={subcategory.intro}
        meta={
          category.subcategories.length > 1 ? (
            <ul className="df-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {category.subcategories.map((s) => {
                const isActive = s.slug === subcategory.slug;
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cx(
                        'inline-block whitespace-nowrap rounded-lg border px-4 py-2 text-[14px] transition-colors',
                        isActive
                          ? 'border-primary-500 bg-primary-50 font-medium text-primary-800'
                          : 'border-line bg-white text-ink-500 hover:border-primary-500 hover:text-primary-800',
                      )}
                    >
                      {s.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null
        }
      />

      <div className="df-container py-8 md:py-10">
        <CategoryProducts products={products} />

        <div className="mt-14 space-y-12">
          <SeoContent sections={subcategory.seoSections} />
          <FaqSection faqs={subcategory.faqs} />
        </div>
      </div>
    </>
  );
}

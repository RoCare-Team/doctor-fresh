import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getAllCategories, getCategory, getProductsByCategory, getProductsByIds } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

export function generateStaticParams() {
  return getAllCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return metaFor({
    title: category.metaTitle || `${category.name} - Doctor Fresh`,
    description: category.metaDescription,
    path: category.href,
  });
}

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  // Products linked from the live category page, plus everything mapped to it.
  const listed = getProductsByIds(category.productIds);
  const owned = getProductsByCategory(category.slug);
  const seen = new Set();
  const products = [...owned, ...listed].filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

  return (
    <>
      <PageHeader
        breadcrumb={[{ name: 'Products', href: '/all-category' }, { name: category.name, href: category.href }]}
        eyebrow="Category"
        title={category.heading || category.name}
        lead={category.intro}
        meta={
          category.subcategories.length ? (
            <ul className="df-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {category.subcategories.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="inline-block whitespace-nowrap rounded-lg border border-line bg-white px-4 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-500 hover:text-primary-800"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null
        }
      />

      <div className="df-container py-8 md:py-10">
        <CategoryProducts products={products} />

        <div className="mt-14 space-y-12">
          <SeoContent sections={category.seoSections} />
          <FaqSection faqs={category.faqs} />
        </div>
      </div>
    </>
  );
}

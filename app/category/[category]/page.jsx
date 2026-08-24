import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getAllCategories, getCategory, getProductsByCategory, getProductsByIds } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};

  return metaFor({
    title: category.metaTitle || `${category.name} - Doctor Fresh`,
    description: category.metaDescription,
    path: category.href,
  });
}

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  // Products linked from the live category page, plus everything mapped to it.
  const listed = await getProductsByIds(category.productIds);
  const owned = await getProductsByCategory(category.slug);
  const seen = new Set();
  const products = [...owned, ...listed].filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

  return (
    <>
      {/* thin nav strip, then straight into the results */}
      <div className="border-b border-line bg-white">
        <div className="df-container py-2.5">
          <Breadcrumb
            items={[{ name: 'Products', href: '/all-category' }, { name: category.name, href: category.href }]}
          />
        </div>
      </div>

      <div className="df-container pt-5 pb-10 md:pb-12">
        <h1 className="mb-4 text-[19px] font-semibold leading-snug tracking-tight text-ink-900 md:text-[22px]">
          {category.heading || category.name}
        </h1>

        <CategoryProducts products={products} subcategories={category.subcategories} />

        <div className="mt-14 space-y-12">
          <SeoContent sections={category.seoSections} />
          <FaqSection faqs={category.faqs} />
        </div>
      </div>
    </>
  );
}

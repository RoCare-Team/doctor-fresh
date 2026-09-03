import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import {
  getAllCategories, getSubcategory, getProductsBySubcategory, getProductsByIds, cardProduct,
} from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllCategories()).flatMap((c) =>
    c.subcategories.map((s) => ({ category: c.slug, subcategory: s.slug })),
  );
}

export async function generateMetadata({ params }) {
  const { category, subcategory } = await params;
  const found = await getSubcategory(category, subcategory);
  if (!found) return {};

  return metaFor({
    title: found.subcategory.metaTitle || `${found.subcategory.name} - Doctor Fresh`,
    description: found.subcategory.metaDescription,
    keywords: found.subcategory.keywords,
    path: found.subcategory.href,
  });
}

export default async function SubcategoryPage({ params }) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const found = await getSubcategory(categorySlug, subcategorySlug);
  if (!found) notFound();

  const { category, subcategory } = found;
  const listed = await getProductsByIds(subcategory.productIds);
  const owned = await getProductsBySubcategory(category.slug, subcategory.slug);
  const seen = new Set();
  const products = [...owned, ...listed]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .map(cardProduct);

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="df-container py-2.5">
          <Breadcrumb
            items={[
              { name: 'Products', href: '/all-category' },
              { name: category.name, href: category.href },
              { name: subcategory.name, href: subcategory.href },
            ]}
          />
        </div>
      </div>

      <div className="df-container pt-5 pb-10 md:pb-12">
        <h1 className="mb-4 text-[19px] font-semibold leading-snug tracking-tight text-ink-900 md:text-[22px]">
          {subcategory.heading || subcategory.name}
        </h1>

        <CategoryProducts
          products={products}
          subcategories={category.subcategories}
          activeSlug={subcategory.slug}
        />

        <div className="mt-14 space-y-12">
          <SeoContent sections={subcategory.seoSections} />
          <FaqSection faqs={subcategory.faqs} />
        </div>
      </div>
    </>
  );
}

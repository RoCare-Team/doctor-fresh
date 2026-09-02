import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import {
  getAllCategories, getSubcategory, getProductsBySubcategory, getProductsByIds,
  SUBCATEGORY_BRANDS as BRANDS,
} from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllCategories()).flatMap((c) =>
    c.subcategories.flatMap((s) =>
      Object.keys(BRANDS).map((brand) => ({ category: c.slug, subcategory: s.slug, brand })),
    ),
  );
}

export async function generateMetadata({ params }) {
  const { category, subcategory, brand } = await params;
  const found = await getSubcategory(category, subcategory);
  const brandName = BRANDS[brand];
  if (!found || !brandName) return {};

  return metaFor({
    title: `${brandName} ${found.subcategory.name} - Buy Online`,
    description: found.subcategory.metaDescription,
    path: `${found.subcategory.href}/${brand}`,
  });
}

export default async function BrandSubcategoryPage({ params }) {
  const { category: categorySlug, subcategory: subcategorySlug, brand } = await params;
  const found = await getSubcategory(categorySlug, subcategorySlug);
  const brandName = BRANDS[brand];
  if (!found || !brandName) notFound();

  const { category, subcategory } = found;
  const listed = await getProductsByIds(subcategory.productIds);
  const owned = await getProductsBySubcategory(category.slug, subcategory.slug);
  const seen = new Set();
  const products = [...owned, ...listed]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .filter((p) => p.name.toLowerCase().includes('doctor fresh') || brand === 'doctor-fresh');

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="df-container py-2.5">
          <Breadcrumb
            items={[
              { name: 'Products', href: '/all-category' },
              { name: category.name, href: category.href },
              { name: subcategory.name, href: subcategory.href },
              { name: brandName, href: subcategory.href + '/' + brand },
            ]}
          />
        </div>
      </div>

      <div className="df-container pt-5 pb-10 md:pb-12">
        <h1 className="mb-4 text-[19px] font-semibold leading-snug tracking-tight text-ink-900 md:text-[22px]">
          {brandName} {subcategory.name}
        </h1>

        <CategoryProducts products={products} subcategories={category.subcategories} activeSlug={subcategory.slug} />

        <div className="mt-14 space-y-12">
          <SeoContent sections={subcategory.seoSections} />
          <FaqSection faqs={subcategory.faqs} />
        </div>
      </div>
    </>
  );
}

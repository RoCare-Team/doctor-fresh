import { notFound } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getAllCategories, getSubcategory, getProductsBySubcategory, getProductsByIds } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// The live site exposes a brand level under every subcategory (currently only
// "doctor-fresh"). The URLs are linked from the mega menu, so they are kept.
const BRANDS = { 'doctor-fresh': 'Doctor Fresh' };

export function generateStaticParams() {
  return getAllCategories().flatMap((c) =>
    c.subcategories.flatMap((s) =>
      Object.keys(BRANDS).map((brand) => ({ category: c.slug, subcategory: s.slug, brand })),
    ),
  );
}

export async function generateMetadata({ params }) {
  const { category, subcategory, brand } = await params;
  const found = getSubcategory(category, subcategory);
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
  const found = getSubcategory(categorySlug, subcategorySlug);
  const brandName = BRANDS[brand];
  if (!found || !brandName) notFound();

  const { category, subcategory } = found;
  const listed = getProductsByIds(subcategory.productIds);
  const owned = getProductsBySubcategory(category.slug, subcategory.slug);
  const seen = new Set();
  const products = [...owned, ...listed]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .filter((p) => p.name.toLowerCase().includes('doctor fresh') || brand === 'doctor-fresh');

  return (
    <>
      <PageHeader
        breadcrumb={[
          { name: 'Products', href: '/all-category' },
          { name: category.name, href: category.href },
          { name: subcategory.name, href: subcategory.href },
          { name: brandName, href: `${subcategory.href}/${brand}` },
        ]}
        eyebrow={brandName}
        title={`${brandName} ${subcategory.name}`}
        lead={subcategory.intro}
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

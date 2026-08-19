import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
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
    <div className="df-container py-6 md:py-8">
      <Breadcrumb
        items={[
          { name: 'Products', href: '/all-category' },
          { name: category.name, href: category.href },
          { name: subcategory.name, href: subcategory.href },
          { name: brandName, href: `${subcategory.href}/${brand}` },
        ]}
      />

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">
          {brandName} {subcategory.name}
        </h1>
        {subcategory.intro ? (
          <p className="mt-2.5 max-w-3xl text-[15.5px] leading-relaxed text-ink-400">{subcategory.intro}</p>
        ) : null}
      </header>

      <CategoryProducts products={products} />

      <div className="mt-12 space-y-10">
        <SeoContent sections={subcategory.seoSections} />
        <FaqSection faqs={subcategory.faqs} />
      </div>
    </div>
  );
}

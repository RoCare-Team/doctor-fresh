import { notFound } from 'next/navigation';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import {
  getSubcategory, getProductsBySubcategory, getProductsByIds,
  SUBCATEGORY_BRANDS as BRANDS, cardProduct,
} from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// A saved edit drops this page at once — the admin purges it by tag — so the
// timer only covers changes made straight in the PHP panel, which nothing
// here can know about. Fifteen minutes rather than five: every expiry means a
// page rebuilt from the database in Singapore, and that wait is what a visitor
// feels as a slow first byte.
export const revalidate = 900;

export async function generateStaticParams() {
  // Built on first visit and then cached, rather than at deploy — only the
  // pages a visitor reaches first are prerendered.
  return [];
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
    .filter((p) => p.name.toLowerCase().includes('doctor fresh') || brand === 'doctor-fresh')
    .map(cardProduct);

  return (
    <>
      <div className="df-container pt-4 pb-10 md:pb-12">
        <CategoryProducts
          products={products}
          subcategories={category.subcategories}
          heading={`${brandName} ${subcategory.name}`}
          breadcrumb={[
            { name: 'Products', href: '/all-category' },
            { name: category.name, href: category.href },
            { name: subcategory.name, href: subcategory.href },
            { name: brandName, href: subcategory.href + '/' + brand },
          ]}
          activeSlug={subcategory.slug}
          trail={[
            { name: 'Products', href: '/all-category' },
            { name: category.name, href: category.href },
            { name: subcategory.name, href: subcategory.href },
          ]}
          activeName={`${brandName} ${subcategory.name}`}
        />

        <div className="mt-14 space-y-12">
          <SeoContent sections={subcategory.seoSections} html={subcategory.richHtml} />
          <FaqSection faqs={subcategory.faqs} />
        </div>
      </div>
    </>
  );
}

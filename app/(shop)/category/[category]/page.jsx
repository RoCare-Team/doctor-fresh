import { notFound } from 'next/navigation';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import {
  getAllCategories, getCategory, getProductsByCategory, getProductsByIds, cardProduct,
} from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// A saved edit drops this page at once — the admin purges it by tag — so the
// timer only covers changes made straight in the PHP panel, which nothing
// here can know about. Fifteen minutes rather than five: every expiry means a
// page rebuilt from the database in Singapore, and that wait is what a visitor
// feels as a slow first byte.
export const revalidate = 900;

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
  const products = [...owned, ...listed]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .map(cardProduct);

  return (
    <>
      <div className="df-container pt-4 pb-10 md:pb-12">
        <CategoryProducts
          products={products}
          subcategories={category.subcategories}
          heading={category.heading || category.name}
          breadcrumb={[
            { name: 'Products', href: '/all-category' },
            { name: category.name, href: category.href },
          ]}
          trail={[{ name: 'Products', href: '/all-category' }]}
          activeName={category.name}
          categoryHref={category.href}
        />

        <div className="mt-14 space-y-12">
          <SeoContent sections={category.seoSections} html={category.richHtml} />
          <FaqSection faqs={category.faqs} />
        </div>
      </div>
    </>
  );
}

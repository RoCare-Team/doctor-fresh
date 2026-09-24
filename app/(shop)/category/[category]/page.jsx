import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
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
          <SeoContent sections={category.seoSections} html={category.richHtml} />
          <FaqSection faqs={category.faqs} />
        </div>
      </div>
    </>
  );
}

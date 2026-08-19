import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
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
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Products', href: '/all-category' }, { name: category.name, href: category.href }]} />

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">
          {category.heading || category.name}
        </h1>
        {category.intro ? (
          <p className="mt-2.5 max-w-3xl text-[15.5px] leading-relaxed text-ink-400">{category.intro}</p>
        ) : null}
      </header>

      {category.subcategories.length ? (
        <nav aria-label="Subcategories" className="mb-7">
          <ul className="df-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
            {category.subcategories.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-block whitespace-nowrap rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <CategoryProducts products={products} />

      <div className="mt-12 space-y-10">
        <SeoContent sections={category.seoSections} />
        <FaqSection faqs={category.faqs} />
      </div>
    </div>
  );
}

import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getCategory, getProductsByCategory, getProductsByIds } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

const CATEGORY_SLUG = 'water-purifier-spare-parts';

export const metadata = metaFor({
  title: 'Water purifier spare parts',
  description:
    'Genuine Doctor Fresh water purifier spare parts — filters, membranes, cartridges, pumps, UV lamps and housings.',
  path: '/spare-parts',
});

export default function SparePartsPage() {
  const category = getCategory(CATEGORY_SLUG);
  const listed = getProductsByIds(category?.productIds || []);
  const owned = getProductsByCategory(CATEGORY_SLUG);
  const seen = new Set();
  const products = [...owned, ...listed].filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Spare Parts', href: '/spare-parts' }]} />

      <header className="mt-4 mb-7">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">
          Water purifier spare parts
        </h1>
        <p className="mt-2.5 max-w-3xl text-[15.5px] leading-relaxed text-ink-400">
          {category?.intro ||
            'Genuine filters, RO membranes, cartridges, pumps and UV lamps for every Doctor Fresh water purifier model.'}
        </p>
      </header>

      <CategoryProducts products={products} />

      <div className="mt-12 space-y-10">
        <SeoContent sections={category?.seoSections || []} />
        <FaqSection faqs={category?.faqs || []} />
      </div>
    </div>
  );
}

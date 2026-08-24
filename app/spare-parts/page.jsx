import Breadcrumb from '@/components/common/Breadcrumb';
import CategoryProducts from '@/components/categories/CategoryProducts';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import { getCategory, getProductsByCategory, getProductsByIds } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

const CATEGORY_SLUG = 'water-purifier-spare-parts';

export const metadata = metaFor({
  title: 'Water purifier spare parts',
  description:
    'Genuine Doctor Fresh water purifier spare parts — filters, membranes, cartridges, pumps, UV lamps and housings.',
  path: '/spare-parts',
});

export default async function SparePartsPage() {
  const category = await getCategory(CATEGORY_SLUG);
  const listed = await getProductsByIds(category?.productIds || []);
  const owned = await getProductsByCategory(CATEGORY_SLUG);
  const seen = new Set();
  const products = [...owned, ...listed].filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Spare Parts', href: '/spare-parts' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">
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
    </>
  );
}

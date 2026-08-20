import ProductCard from './ProductCard';
import Reveal from '@/components/common/Reveal';

/**
 * Product grid: 1 card per row on mobile, 2 on tablet, 3 on desktop.
 * Gaps step 14 → 16 → 20px so rows stay aligned at every width.
 */
export default function ProductGrid({ products = [], columns = 3, compact = false }) {
  if (!products.length) return null;

  const cols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-3.5 sm:gap-4 xl:gap-5 ${cols}`}>
      {products.map((p, i) => (
        // cards in a row arrive a beat apart, capped so long grids never lag
        <Reveal key={p.id} delay={(i % 3) * 70} className="h-full">
          <ProductCard product={p} compact={compact} />
        </Reveal>
      ))}
    </div>
  );
}

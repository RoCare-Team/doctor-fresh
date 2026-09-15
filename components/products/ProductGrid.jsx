import ProductCard from './ProductCard';
import Reveal from '@/components/common/Reveal';

/**
 * Product grid: 2 cards per row on a phone — the card has a compact phone
 * layout made for half the screen, as shop apps show them — 3 on desktop.
 * On a phone the rows sit further apart (20px) than the columns (10px), so
 * each card reads as its own block rather than running into the one below.
 * From sm up the gap is even: 16 → 20px.
 */
export default function ProductGrid({ products = [], columns = 3, compact = false }) {
  if (!products.length) return null;

  const cols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-3',
  }[columns] || 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-x-2.5 gap-y-5 sm:gap-4 xl:gap-5 ${cols}`}>
      {products.map((p, i) => (
        // cards in a row arrive a beat apart, capped so long grids never lag
        <Reveal key={p.id} delay={(i % 3) * 70} className="h-full">
          <ProductCard product={p} compact={compact} />
        </Reveal>
      ))}
    </div>
  );
}

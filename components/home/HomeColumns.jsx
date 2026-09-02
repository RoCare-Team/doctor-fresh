import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice, cx } from '@/lib/utils';

/**
 * The three short columns the home page ends on: Latest Products, Recently
 * Viewed and Most Viewed.
 *
 * "Latest" and "Most Viewed" come from the catalogue — `add_timestamp` and
 * `number_of_view`, the columns the PHP site sorts by. "Recently Viewed" is
 * this visitor's own cookie, read on the server, so it is in the page from the
 * first paint and simply absent until they have opened a product.
 */
export default function HomeColumns({ latest = [], recent = [], mostViewed = [] }) {
  const columns = [
    { title: 'Latest Products', eyebrow: 'Just added', href: '/all-category', products: latest },
    { title: 'Recently Viewed', eyebrow: 'Pick up where you left off', products: recent },
    { title: 'Most Viewed', eyebrow: 'Popular this month', href: '/all-category', products: mostViewed },
  ].filter((c) => c.products.length);

  if (!columns.length) return null;

  return (
    <section className="border-t border-line bg-surface-muted">
      <div
        className={cx(
          'df-container df-section grid gap-5 md:grid-cols-2',
          // With Recently Viewed absent, two columns should share the width
          // rather than leave a third of the row empty.
          columns.length === 3 && 'lg:grid-cols-3',
        )}
      >
        {columns.map((c) => <Column key={c.title} {...c} />)}
      </div>
    </section>
  );
}

function Column({ title, eyebrow, href, products }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-primary-600">{eyebrow}</p>
          <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            aria-label={`See all — ${title}`}
            className="mt-1 shrink-0 rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-surface-muted hover:text-primary-700"
          >
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {/* hairlines between rows, rather than a box inside a box */}
      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p.id}>
            <MiniCard product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniCard({ product }) {
  return (
    <Link href={product.url} className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-primary-50/60">
      {/* The photos are shot on white with their own margin, so the well is
          white and unpadded — a tint and a gap around them only made the
          product look smaller than the space it was given. */}
      <span className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-white sm:h-[104px] sm:w-[104px]">
        <SafeImage
          src={product.image}
          alt=""
          fill
          sizes="(max-width: 640px) 84px, 104px"
          className="object-contain transition-transform duration-300 group-hover:scale-105"
          iconSize={30}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-ink-900 transition-colors group-hover:text-primary-700">
          {product.name}
        </span>
        {product.category ? (
          <span className="mt-1 block text-[13px] text-ink-400">{product.category}</span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
          {product.price ? (
            <>
              <span className="text-[17px] font-semibold tracking-tight text-ink-900">
                {formatPrice(product.price)}
              </span>
              {product.mrp > product.price ? (
                <span className="text-[13px] text-ink-300 line-through">
                  {formatPrice(product.mrp)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[14px] font-medium text-primary-700">On request</span>
          )}
        </span>
      </span>
    </Link>
  );
}

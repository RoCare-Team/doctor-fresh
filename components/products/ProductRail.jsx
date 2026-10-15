import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import RailControls from '@/components/common/RailControls';
import { cx } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

/**
 * Horizontally scrollable product row — CSS scroll-snap only, no carousel
 * library, and rendered on the server: only the dots below it are client code,
 * so a row of cards costs the browser nothing to take over.
 *
 * Steered by the dots under the track and by arrows either side of it, which
 * sit in gutters the row leaves from tablet up — the same inset as the deal
 * and category rows above, so every heading and card edge lines up.
 */
export default function ProductRail({
  title, href, products = [], tone = 'plain', id, framed = false,
}) {
  if (!products.length) return null;

  // The dots find the track by this, so every row on a page needs its own.
  const trackId = `rail-${id || (title || 'products').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  if (framed) {
    return (
      <section>
        <Reveal className="mb-4 flex flex-wrap items-end justify-end gap-3">
          {title ? (
            <h2 className="mr-auto min-w-0 text-[20px] font-semibold tracking-[-0.02em] text-ink-900 md:text-[24px]">
              {title}
            </h2>
          ) : null}

          {href ? (
            <Link
              href={href}
              className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-4 text-[13.5px] font-semibold text-primary-700 transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white"
            >
              View all
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </Reveal>

        <div className="relative">
          <ul
            id={trackId}
            className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:gap-4 sm:px-0 xl:gap-5"
          >
            {products.map((p) => (
              <li
                key={p.id}
                className="w-[calc(50%-0.4375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
              >
                <ProductCard product={p} />
              </li>
            ))}
          </ul>

          <RailControls trackId={trackId} label={`${title || 'Products'}, page`} arrows />
        </div>
      </section>
    );
  }

  return (
    <section className={cx(tone === 'muted' && 'border-y border-line')}>
      <div className="df-container df-section">
        {/* Three tracks so the heading is centred on the section itself, not
            on the space left over beside the link. The empty first track
            mirrors the link in the third. */}
        {/* On a phone the title and the link share one row — stacked and
            centred they cost a third of a screen before the first card. */}
        <Reveal className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:text-center">
          <span className="hidden sm:block" aria-hidden="true" />

          <h2 className="text-[19px] font-semibold tracking-tight text-ink-900 sm:text-[26px] md:text-[32px]">
            {title}
          </h2>

          <div className="flex shrink-0 items-center justify-end">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-1 whitespace-nowrap text-[13.5px] font-medium text-primary-700 transition-colors hover:text-primary-800 sm:gap-1.5 sm:text-[15px]"
              >
                View all
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </Reveal>

        <div className="relative">
          <ul
            id={trackId}
            className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:gap-4 sm:px-0 xl:gap-5"
          >
            {products.map((p) => (
              <li
                key={p.id}
                className="w-[calc(50%-0.4375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] xl:w-[calc(25%-0.9375rem)]"
              >
                <ProductCard product={p} />
              </li>
            ))}
          </ul>

          <RailControls trackId={trackId} label={`${title}, page`} arrows />
        </div>
      </div>
    </section>
  );
}

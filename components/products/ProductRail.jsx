'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import SliderDots, { pageState, goToPage, measureLater } from '@/components/common/SliderDots';
import { cx } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

/**
 * Horizontally scrollable product row — CSS scroll-snap only, no carousel library.
 *
 * Steered by the dots under the track, the same marker the hero uses. Arrows
 * beside the heading were a second control for the same job.
 */
export default function ProductRail({ title, href, products = [], tone = 'plain' }) {
  const trackRef = useRef(null);
  const [{ pages, current }, setPaging] = useState({ pages: 1, current: 0 });

  function update() {
    setPaging(pageState(trackRef.current));
  }

  useEffect(() => {
    const cancel = measureLater(update);
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => { cancel(); window.removeEventListener('resize', onResize); };
  }, [products.length]);

  const goTo = (page) => goToPage(trackRef.current, page);

  if (!products.length) return null;

  return (
    <section className={cx(tone === 'muted' && 'border-y border-line bg-surface-muted')}>
      <div className="df-container df-section">
        {/* Three tracks so the heading is centred on the section itself, not
            on the space left over beside the link. The empty first track
            mirrors the link in the third. */}
        {/* On a phone the title and the link share one row — stacked and
            centred they cost a third of a screen before the first card. */}
        <Reveal className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4 sm:grid sm:items-center sm:text-center sm:grid-cols-[1fr_auto_1fr]">
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

        <ul
          ref={trackRef}
          onScroll={update}
          className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:gap-4 md:mx-0 md:px-0 xl:gap-5"
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

        <SliderDots pages={pages} current={current} onSelect={goTo} label={`${title}, page`} />
      </div>
    </section>
  );
}

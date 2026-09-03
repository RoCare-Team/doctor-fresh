'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import SliderDots, { pageState, goToPage } from '@/components/common/SliderDots';
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
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [products.length]);

  const goTo = (page) => goToPage(trackRef.current, page);

  if (!products.length) return null;

  return (
    <section className={cx(tone === 'muted' && 'border-y border-line bg-surface-muted')}>
      <div className="df-container df-section">
        {/* Three tracks so the heading is centred on the section itself, not
            on the space left over beside the link. The empty first track
            mirrors the link in the third. */}
        <Reveal className="mb-4 grid items-center gap-3 text-center sm:grid-cols-[1fr_auto_1fr]">
          <span className="hidden sm:block" aria-hidden="true" />

          <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            {title}
          </h2>

          <div className="flex items-center justify-center sm:justify-end">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
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

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { cx } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

/**
 * Horizontally scrollable product row — CSS scroll-snap only, no carousel library.
 */
export default function ProductRail({ title, href, products = [], tone = 'plain' }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [products.length]);

  function scrollBy(direction) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  }

  if (!products.length) return null;

  return (
    <section className={cx(tone === 'muted' && 'border-y border-line bg-surface-muted')}>
      <div className="df-container df-section">
        {/* Three tracks so the heading is centred on the section itself, not
            on the space left over beside the controls. The empty first track
            mirrors the controls in the third. */}
        <Reveal className="mb-4 grid items-center gap-3 text-center sm:grid-cols-[1fr_auto_1fr]">
          <span className="hidden sm:block" aria-hidden="true" />

          <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            {title}
          </h2>

          <div className="flex items-center justify-center gap-4 sm:justify-end">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
              >
                View all
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                disabled={atStart}
                aria-label={`Scroll ${title} left`}
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors',
                  atStart
                    ? 'cursor-default border-line text-ink-300'
                    : 'border-line-strong text-ink-700 hover:border-primary-500 hover:text-primary-800',
                )}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                disabled={atEnd}
                aria-label={`Scroll ${title} right`}
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors',
                  atEnd
                    ? 'cursor-default border-line text-ink-300'
                    : 'border-line-strong text-ink-700 hover:border-primary-500 hover:text-primary-800',
                )}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </Reveal>

        <ul
          ref={trackRef}
          onScroll={updateArrows}
          className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:gap-4 md:mx-0 md:px-0 xl:gap-5"
        >
          {products.map((p) => (
            <li
              key={p.id}
              className="w-[86%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] xl:w-[calc(25%-0.9375rem)]"
            >
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

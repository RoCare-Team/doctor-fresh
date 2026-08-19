'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl, cx } from '@/lib/utils';

export default function CategoryTiles({ tiles = [] }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // The live site repeats a tile; keep the first occurrence of each destination.
  const seen = new Set();
  const items = tiles.filter((t) => (seen.has(t.href) ? false : seen.add(t.href)));

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
  }, []);

  function scrollBy(direction) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  }

  if (!items.length) return null;

  return (
    <section className="df-section df-container">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="df-eyebrow">Browse the range</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            Shop by Category
          </h2>
          <p className="mt-2 text-[15.5px] text-ink-400">
            Find the perfect solution for your pure water needs
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/all-category"
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label="Scroll categories left"
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
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
              aria-label="Scroll categories right"
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                atEnd
                  ? 'cursor-default border-line text-ink-300'
                  : 'border-line-strong text-ink-700 hover:border-primary-500 hover:text-primary-800',
              )}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={trackRef}
        onScroll={updateArrows}
        className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      >
        {items.map((t) => (
          <li
            key={t.href}
            className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[18%] xl:w-[15.5%]"
          >
            <Link
              href={t.href}
              className="df-card df-card-hover group flex h-full flex-col items-center gap-3 px-3 py-4 text-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted transition-colors group-hover:bg-primary-50">
                <Image
                  src={imageUrl(t.icon)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-105"
                  unoptimized
                />
              </span>

              <span className="flex-1 text-[14.5px] font-medium leading-snug text-ink-900">
                {t.label}
              </span>

              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink-300 transition-colors group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-ink-900">
                <ArrowUpRight size={14} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

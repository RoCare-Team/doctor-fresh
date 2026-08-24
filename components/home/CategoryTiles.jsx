'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl, cx } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

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
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
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
      </Reveal>

      <ul
        ref={trackRef}
        onScroll={updateArrows}
        className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      >
        {items.map((t) => (
          <li
            key={t.href}
            className="w-[72%] shrink-0 snap-start sm:w-[46%] md:w-[34%] lg:w-[25.5%] xl:w-[24%]"
          >
            <Link
              href={t.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-primary-100 p-4 transition-colors hover:bg-primary-200"
            >
              <h3 className="px-1 text-[16px] font-semibold leading-snug text-ink-900 md:text-[17px]">
                {t.label}
              </h3>

              {/* product shots are shot on white, so they sit on a white panel
                  — the background then reads as part of the card, not a patch */}
              <div className="relative mt-3 flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-white md:h-52">
                {t.image ? (
                  <Image
                    src={imageUrl(t.image)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 72vw, (max-width: 1024px) 34vw, 280px"
                    className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <Image
                    src={imageUrl(t.icon)}
                    alt=""
                    width={62}
                    height={53}
                    className="h-20 w-auto opacity-70 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                )}
              </div>

              <span className="mt-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-colors group-hover:bg-primary-900">
                  Shop now
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

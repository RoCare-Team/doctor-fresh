'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Droplets } from 'lucide-react';
import SliderDots, { pageState, goToPage } from '@/components/common/SliderDots';
import { imageUrl } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

export default function CategoryTiles({ tiles = [] }) {
  const trackRef = useRef(null);
  const [{ pages, current }, setPaging] = useState({ pages: 1, current: 0 });

  // The live site repeats a tile; keep the first occurrence of each destination.
  const seen = new Set();
  const items = tiles.filter((t) => (seen.has(t.href) ? false : seen.add(t.href)));

  function update() {
    setPaging(pageState(trackRef.current));
  }

  useEffect(() => {
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const goTo = (page) => goToPage(trackRef.current, page);

  if (!items.length) return null;

  return (
    <section className="df-section df-container">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            Shop by Category
          </h2>
        </div>

        <div className="flex items-center">
          <Link
            href="/all-category"
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

        </div>
      </Reveal>

      <ul
        ref={trackRef}
        onScroll={update}
        className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      >
        {items.map((t) => (
          <li
            key={t.href}
            className="w-full shrink-0 snap-start sm:w-[46%] md:w-[34%] lg:w-[25.5%] xl:w-[24%]"
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
              <div className="relative mt-3 flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-white sm:h-44 md:h-52">
                {t.image ? (
                  <Image
                    src={imageUrl(t.image)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 34vw, 280px"
                    className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  /* A few categories (STP, ETP) carry no product photo yet, so
                     the tile shows a mark rather than an empty image. */
                  <Droplets
                    size={52}
                    strokeWidth={1.4}
                    className="text-primary-500/45 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                    aria-hidden="true"
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

      <SliderDots pages={pages} current={current} onSelect={goTo} label="Categories, page" />
    </section>
  );
}

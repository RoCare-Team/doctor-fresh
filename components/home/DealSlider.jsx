'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import SliderDots, { pageState, goToPage } from '@/components/common/SliderDots';
import { formatPrice } from '@/lib/utils';

/**
 * Compact deal carousel used inside the Today's Deal banner. Two cards are
 * visible at a time and the rest scroll, so the artwork behind the banner stays
 * uncovered however many deals are configured.
 */
export default function DealSlider({ deals = [] }) {
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
  }, [deals.length]);

  const goTo = (page) => goToPage(trackRef.current, page);

  if (!deals.length) return null;

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={update}
        className="df-no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
      >
        {deals.map((p) => (
          <li key={p.id} className="w-[calc(50%-0.375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)]">
            <Link
              href={p.url}
              className="group flex h-full flex-col rounded-2xl bg-white p-2 transition-shadow duration-200 hover:shadow-[0_14px_28px_-16px_rgb(6_59_76_/_0.5)]"
            >
              {/* The product leads the card. The well is white and unpadded
                  because the photos are shot on white: a tinted frame around
                  them boxed the product into a small square in the middle. */}
              <span className="relative block">
                <span className="relative block h-[156px] w-full overflow-hidden rounded-xl bg-white sm:h-[176px]">
                  <SafeImage
                    src={p.images?.[0]}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 78vw, 300px"
                    className="object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                    iconSize={28}
                  />
                </span>

                {p.discountPercent > 0 ? (
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-primary-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {p.discountPercent}% off
                  </span>
                ) : null}
              </span>

              <span className="mt-1.5 line-clamp-2 block min-h-[32px] px-1 text-[13px] font-medium leading-tight text-ink-900 transition-colors group-hover:text-primary-700">
                {p.name}
              </span>

              <span className="mt-auto flex items-center justify-between gap-2 px-1 pt-1.5">
                {p.price ? (
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[16px] font-semibold tracking-tight text-ink-900">
                      {formatPrice(p.price)}
                    </span>
                    {p.mrp > p.price ? (
                      <span className="text-[12px] text-ink-300 line-through">{formatPrice(p.mrp)}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-primary-700">On request</span>
                )}

                <span className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary-500 px-3.5 text-[12.5px] font-semibold text-white transition-colors group-hover:bg-ink-900">
                  View
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <SliderDots
        pages={pages}
        current={current}
        onSelect={goTo}
        tone="dark"
        label="Deals, page"
      />
    </div>
  );
}

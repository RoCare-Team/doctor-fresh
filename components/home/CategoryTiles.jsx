import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import { ArrowRight, Droplets } from 'lucide-react';
import RailControls from '@/components/common/RailControls';
import { imageUrl } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

/**
 * Shop by Category: the same treatment as Today's Deal above it — a two-line
 * heading, then a row of cards that scrolls by swipe, the dots, or the arrows
 * in its gutters (from tablet up; at its edges on a phone).
 */
export default function CategoryTiles({ tiles = [] }) {
  // The live site repeats a tile; keep the first occurrence of each destination.
  const seen = new Set();
  const items = tiles.filter((t) => (seen.has(t.href) ? false : seen.add(t.href)));

  if (!items.length) return null;

  return (
    <section className="df-section df-container">
      {/* inset like the cards below, which leave their gutters to the arrows */}
      <Reveal className="mb-3 flex flex-wrap items-end justify-between gap-4 sm:mb-4 md:mb-5">
        <div className="max-w-2xl">
          {/* the heading, with how many ranges there are as a quiet aside */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
              Shop by <span className="text-primary-600">Category</span>
            </h2>
            <span className="border-l border-line-strong pl-3 text-[14px] font-medium text-ink-400">
              {items.length} ranges
            </span>
          </div>
          <p className="mt-1 hidden text-[14.5px] text-ink-400 sm:block">
            From home purifiers to commercial RO plants — find the right range for your water.
          </p>
        </div>

        <Link
          href="/all-category"
          className="group hidden items-center sm:inline-flex gap-1.5 rounded-full border border-line-strong bg-white px-4 py-2 text-[14px] font-semibold text-ink-900 transition-colors hover:border-primary-300 hover:text-primary-700"
        >
          View all categories
          <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>

      <div className="relative">
        <ul
          id="rail-categories"
          className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0 xl:gap-5"
        >
          {items.map((t) => (
            <li
              key={t.href}
              className="w-[calc(50%-0.4375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-1rem)]"
            >
              <Link
                href={t.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e6ecf0] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_22px_40px_-24px_rgb(6_59_76/0.45)]"
              >
                {/* the product on a soft grey stage; photos are shot on
                    white, so they are multiplied into it */}
                <span className="relative m-2 mb-0 flex h-[130px] items-center justify-center overflow-hidden rounded-xl bg-[#f4f7f9] sm:h-[150px]">
                  {t.image ? (
                    <Image
                      src={imageUrl(t.image)}
                      alt=""
                      fill
                      // two across a phone, five across a desktop
                      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 32vw, 240px"
                      className="object-contain p-3 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    /* A few categories (STP, ETP) carry no product photo yet,
                       so the card shows a mark rather than an empty image. */
                    <Droplets
                      size={44}
                      strokeWidth={1.4}
                      className="text-primary-500/45 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
                  <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-ink-900 transition-colors group-hover:text-primary-700">
                    {t.label}
                  </h3>

                  <span className="mt-auto pt-2.5">
                    <span className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-600 text-[13px] font-semibold text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                      Explore range
                      <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <RailControls trackId="rail-categories" label="Categories, page" arrows />
      </div>
    </section>
  );
}

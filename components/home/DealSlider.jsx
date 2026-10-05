import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { Star } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import RailControls from '@/components/common/RailControls';
import { formatPrice } from '@/lib/utils';

/**
 * The Today's Deal carousel. Two cards are visible at a time on a phone, four
 * on a desktop, and the rest scroll — by swipe, the dots, or the arrows either
 * side of the row (in its gutters from tablet up, at its edges on a phone).
 *
 * Each card says what the deal is worth in rupees — "You save ₹3,300" is
 * what a buyer actually weighs.
 */
export default function DealSlider({ deals = [] }) {
  if (!deals.length) return null;

  return (
    <div className="relative sm:px-12">
      <ul
        id="rail-deals"
        className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0 xl:gap-5"
      >
        {deals.map((p) => {
          const saving = p.mrp > p.price ? p.mrp - p.price : 0;
          return (
            <li
              key={p.id}
              className="w-[calc(50%-0.4375rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(25%-0.9375rem)]"
            >
              <Link
                href={p.url}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e6ecf0] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_22px_40px_-24px_rgb(6_59_76/0.45)]"
              >
                {/* the product on a soft grey stage */}
                <span className="relative m-2 mb-0 block h-[118px] overflow-hidden rounded-xl bg-[#f4f7f9] sm:h-[130px]">
                  <SafeImage
                    src={p.images?.[0]}
                    alt=""
                    fill
                    // two cards per row on a phone, so half the screen
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 32vw, 300px"
                    className="object-contain p-2.5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    iconSize={28}
                  />
                </span>

                <span className="flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
                  {p.rating > 0 ? (
                    <span className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-400">
                      <Star size={12} aria-hidden="true" className="fill-[#f5a524] text-[#f5a524]" />
                      <span className="font-semibold text-ink-700">{Number(p.rating).toFixed(1)}</span>
                      {p.reviewCount ? <span>({p.reviewCount})</span> : null}
                    </span>
                  ) : null}

                  <span className="line-clamp-2 block min-h-[36px] text-[13.5px] font-medium leading-snug text-ink-900 transition-colors group-hover:text-primary-700">
                    {p.name}
                  </span>

                  {p.price ? (
                    <span className="mt-1.5 block">
                      <span className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-[17px] font-bold tracking-tight text-ink-900">
                          {formatPrice(p.price)}
                        </span>
                        {saving ? (
                          <span className="text-[12.5px] text-ink-400 line-through">{formatPrice(p.mrp)}</span>
                        ) : null}
                      </span>
                      {saving ? (
                        <span className="mt-0.5 block text-[12px] font-semibold text-[#15803d]">
                          You save {formatPrice(saving)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="mt-2 block text-[13px] font-medium text-primary-700">Price on request</span>
                  )}

                  <span className="mt-auto pt-2.5">
                    <span className="flex h-8 w-full items-center justify-center rounded-lg border border-primary-600 text-[13px] font-semibold text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                      View deal
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <RailControls trackId="rail-deals" label="Deals, page" arrows />
    </div>
  );
}

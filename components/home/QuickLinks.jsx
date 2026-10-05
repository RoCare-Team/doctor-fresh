import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  Link2, MapPin, ShoppingCart, Wrench, Droplets, Factory, Building2, Star, ChevronDown, ArrowUpRight,
} from 'lucide-react';

const ICONS = {
  link: Link2,
  'map-pin': MapPin,
  'shopping-cart': ShoppingCart,
  wrench: Wrench,
  droplets: Droplets,
  factory: Factory,
  building: Building2,
  star: Star,
};

/**
 * "Quick Links" at the foot of the home page: one collapsible group per
 * section made in the admin. Built on <details>, so it opens without any
 * script and every link is in the page for search engines even when closed.
 *
 * Inset by the same gutter (sm:px-12) as the rails above it. Two columns of
 * groups from lg up keep the block short.
 */
export default function QuickLinks({ sections = [] }) {
  if (!sections.length) return null;

  return (
    <section className="border-t border-line bg-gradient-to-b from-surface-muted to-white" aria-labelledby="quick-links">
      <div className="df-container py-6 md:py-8">
        <div className="sm:px-12">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary-600">Explore more</p>
              <h2 id="quick-links" className="mt-1 text-[22px] font-semibold tracking-tight text-ink-900 md:text-[26px]">
                Quick Links
              </h2>
            </div>
            <p className="text-[13.5px] text-ink-400">Popular cities, products and services at a glance.</p>
          </div>

          <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
            {sections.map((s) => {
              const Icon = ICONS[s.icon] || Link2;
              return (
                <details
                  key={s.id}
                  className="group rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(6_59_76/0.04)] transition-all duration-200 hover:border-primary-200 hover:shadow-[0_10px_24px_-16px_rgb(6_59_76/0.35)] open:border-primary-200 open:shadow-[0_14px_30px_-18px_rgb(6_59_76/0.4)]"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 transition-colors group-open:bg-primary-600 group-open:text-white group-open:ring-primary-600">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold text-ink-900">{s.title}</span>
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11.5px] font-medium text-primary-700">
                      {s.pages.length}
                      <span className="hidden sm:inline"> links</span>
                    </span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-700 transition-all duration-200 group-open:rotate-180 group-open:border-primary-300 group-open:text-primary-700">
                      <ChevronDown size={15} aria-hidden="true" />
                    </span>
                  </summary>
                  <ul className="flex flex-wrap gap-1.5 border-t border-line px-4 pb-4 pt-3">
                    {s.pages.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/${p.slug}`}
                          className="group/l inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-3 py-1 text-[12.5px] text-ink-700 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-800"
                        >
                          {p.name}
                          <ArrowUpRight size={12} aria-hidden="true" className="opacity-0 transition-opacity group-hover/l:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

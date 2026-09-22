import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  Link2, MapPin, ShoppingCart, Wrench, Droplets, Factory, Building2, Star, ChevronDown,
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
 */
export default function QuickLinks({ sections = [] }) {
  if (!sections.length) return null;

  return (
    <section className="border-t border-line bg-surface-muted" aria-labelledby="quick-links">
      <div className="df-container py-10 md:py-12">
        <h2 id="quick-links" className="text-[24px] font-bold tracking-tight text-primary-800 md:text-[28px]">Quick Links</h2>

        <div className="mt-4 space-y-3">
          {sections.map((s) => {
            const Icon = ICONS[s.icon] || Link2;
            return (
              <details key={s.id} className="group rounded-xl border border-primary-100 bg-primary-50/50 transition-colors open:bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <Icon size={18} className="shrink-0 text-ink-700" aria-hidden="true" />
                  <span className="flex-1 text-[16px] font-semibold text-ink-900">{s.title}</span>
                  <span className="hidden text-[12.5px] text-ink-400 sm:inline">{`${s.pages.length} links`}</span>
                  <ChevronDown size={18} className="shrink-0 text-ink-700 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ul className="flex flex-wrap gap-2 border-t border-line px-5 pb-5 pt-4">
                  {s.pages.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/${p.slug}`}
                        className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-800"
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { ArrowRight, ChevronRight, History, Sparkles, TrendingUp } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import Reveal from '@/components/common/Reveal';
import { formatPrice, cx } from '@/lib/utils';

/**
 * The three short columns the home page ends on: Latest Products, Recently
 * Viewed and Most Viewed.
 *
 * "Latest" and "Most Viewed" come from the catalogue — `add_timestamp` and
 * `number_of_view`, the columns the PHP site sorts by. "Recently Viewed" is
 * this visitor's own list (a cookie), fetched by the browser once the page is
 * up, so the page itself is the same for everyone and can be cached; it is
 * simply absent until they have opened a product.
 */
export default function HomeColumns({ latest = [], mostViewed = [] }) {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/recently-viewed')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRecent((d.products || []).slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: 'Latest Products', eyebrow: 'Just added', Icon: Sparkles, href: '/all-category', products: latest },
    { title: 'Recently Viewed', eyebrow: 'Pick up where you left off', Icon: History, products: recent },
    { title: 'Most Viewed', eyebrow: 'Popular this month', Icon: TrendingUp, href: '/all-category', products: mostViewed, ranked: true },
  ].filter((c) => c.products.length);

  if (!columns.length) return null;

  return (
    // White here so the column cards sit on a clean ground. The blog section
    // that follows is tinted, so the page keeps alternating.
    <section className="border-t border-line bg-white">
      {/* sm:px-12 — the same side inset as the deal, service and trust rows */}
      <div className="df-container df-section">
        <div
          className={cx(
            'grid gap-5 sm:px-12 md:grid-cols-2',
            // With Recently Viewed absent, two columns should share the width
            // rather than leave a third of the row empty.
            columns.length === 3 && 'lg:grid-cols-3',
          )}
        >
          {columns.map((c, i) => (
            <Reveal key={c.title} delay={i * 80} className="h-full">
              <Column {...c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Column({ title, eyebrow, Icon, href, products, ranked }) {
  return (
    // The column is a panel of its own so it is obvious which rows belong to
    // "Latest" and which to "Most Viewed". It is tinted rather than white:
    // against a white panel the white rows inside would lose their edges.
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-primary-600">{eyebrow}</p>
          <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            aria-label={`View all — ${title}`}
            className="group/all inline-flex shrink-0 items-center gap-1 rounded-full border border-[#dceaf0] bg-white px-3 py-1.5 text-[12.5px] font-medium text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-50"
          >
            View all
            <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover/all:translate-x-0.5" />
          </Link>
        ) : null}
      </div>

      <ul className="mt-4 flex-1 space-y-2.5">
        {products.map((p, i) => (
          <li key={p.id}>
            <MiniCard product={p} rank={ranked ? i + 1 : null} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniCard({ product, rank }) {
  const off = product.price && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <Link
      href={product.url}
      className="group flex items-center gap-3.5 rounded-2xl border border-[#e6ecf0] bg-white p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_16px_32px_-22px_rgb(6_59_76/0.5)]"
    >
      <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f4f7f9]">
        <SafeImage
          src={product.image}
          alt=""
          fill
          sizes="72px"
          className="object-contain p-1.5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.07]"
          iconSize={26}
        />
        {rank ? (
          <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-primary-700 px-1 text-[11px] font-semibold text-white shadow-sm">
            {rank}
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[14px] font-medium leading-snug text-ink-900 transition-colors group-hover:text-primary-700">
          {product.name}
        </span>
        {product.category ? (
          <span className="mt-0.5 block truncate text-[12px] text-ink-400">{product.category}</span>
        ) : null}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {product.price ? (
            <>
              <span className="text-[15px] font-semibold tracking-tight text-ink-900">
                {formatPrice(product.price)}
              </span>
              {off ? (
                <>
                  <span className="text-[12px] text-ink-400 line-through">{formatPrice(product.mrp)}</span>
                  <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                    {off}% off
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <span className="text-[13px] font-medium text-primary-700">On request</span>
          )}
        </span>
      </span>

      <ChevronRight
        size={16}
        aria-hidden="true"
        className="hidden shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-700 sm:block"
      />
    </Link>
  );
}

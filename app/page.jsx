import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck, Wrench, Timer, Cog, ArrowRight, Phone, Droplets, Flame,
} from 'lucide-react';
import Hero from '@/components/home/Hero';
import TrustBadges from '@/components/home/TrustBadges';
import CategoryTiles from '@/components/home/CategoryTiles';
import WaterTestSection from '@/components/home/WaterTestSection';
import ProductRail from '@/components/products/ProductRail';
import BlogCard from '@/components/blogs/BlogCard';
import { getProductsByIds, getAllBlogPosts } from '@/lib/catalog';
import { heroSlides, trustBadges, categoryTiles, waterTest, rails, todaysDeal, brand } from '@/data/site';
import { metaFor, formatPrice, imageUrl } from '@/lib/utils';

export const metadata = metaFor({
  title: brand.homeTitle,
  description: brand.tagline,
  path: '/',
});

const SERVICES = [
  {
    title: 'RO Repair & Service',
    description: 'Certified technicians, same-day visits and a 30-day service warranty on every repair.',
    href: '/water-purifier-service',
    icon: Wrench,
  },
  {
    title: 'Installation / Uninstallation',
    description: 'Wall mounting, inlet connection and a free TDS check included on every visit.',
    href: '/water-purifier-installation',
    icon: ShieldCheck,
  },
  {
    title: 'AMC Plans',
    description: 'Annual maintenance with scheduled servicing and genuine spare parts.',
    href: '/water-purifier-amc',
    icon: Timer,
  },
  {
    title: 'Spare Parts',
    description: 'Genuine filters, membranes, pumps and cartridges for every Doctor Fresh model.',
    href: '/spare-parts',
    icon: Cog,
  },
];

// Copy for the product rails. The rails and their products come from site data.
const RAIL_COPY = {
  'Featured Products': {
    eyebrow: 'Handpicked',
    subtitle: 'Our most recommended systems, chosen by Doctor Fresh water experts.',
  },
  'Water Purifier': {
    eyebrow: 'For your home',
    subtitle: 'RO, UV, UF and alkaline purifiers for every water source and family size.',
  },
  'RO Plant': {
    eyebrow: 'Commercial & industrial',
    subtitle: '50 LPH to 10,000 LPH plants for offices, hotels, schools and factories.',
  },
  'Water Softener': {
    eyebrow: 'Hard water solved',
    subtitle: 'Protect your bathroom fittings, geysers and washing machine from scaling.',
  },
  'Water Ionizer': {
    eyebrow: 'Alkaline water',
    subtitle: 'Ionized alkaline water with adjustable pH for everyday wellness.',
  },
};

export default function HomePage() {
  const deals = getProductsByIds(todaysDeal).slice(0, 4);
  const posts = getAllBlogPosts().slice(0, 3);

  return (
    <>
      <Hero slides={heroSlides} />

      <TrustBadges badges={trustBadges} />

      {/* ---------------------------------------------------- today's deal */}
      {deals.length ? (
        <section className="df-container df-section">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="df-eyebrow flex items-center gap-1.5">
                <Flame size={14} aria-hidden="true" />
                Limited period
              </p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
                Today&rsquo;s Deal
              </h2>
              <p className="mt-2 text-[15.5px] text-ink-400">
                Best prices of the day on Doctor Fresh bestsellers
              </p>
            </div>
            <Link
              href="/all-category"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
            >
              View all
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((p) => (
              <li key={p.id}>
                <Link href={p.url} className="df-card df-card-hover group flex h-full items-center gap-4 p-4">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                    <Image
                      src={imageUrl(p.images[0])}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14.5px] font-medium leading-snug text-ink-900 transition-colors group-hover:text-primary-800">
                      {p.name}
                    </span>
                    {p.price ? (
                      <span className="mt-2 flex items-baseline gap-2">
                        <span className="text-[17px] font-semibold text-ink-900">{formatPrice(p.price)}</span>
                        {p.mrp > p.price ? (
                          <span className="text-[13px] text-ink-300 line-through">{formatPrice(p.mrp)}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="mt-2 block text-[14px] font-medium text-primary-800">
                        Price on request
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CategoryTiles tiles={categoryTiles} />

      <WaterTestSection waterTest={waterTest} />

      {/* --------------------------------------------------- product rails */}
      {rails.map((rail, i) => (
        <ProductRail
          key={rail.title}
          title={rail.title}
          eyebrow={RAIL_COPY[rail.title]?.eyebrow}
          subtitle={RAIL_COPY[rail.title]?.subtitle}
          href={rail.href}
          products={getProductsByIds(rail.productIds)}
          tone={i % 2 === 1 ? 'muted' : 'plain'}
        />
      ))}

      {/* --------------------------------------------------------- services */}
      <section className="df-container df-section">
        <div className="mb-8 max-w-2xl">
          <p className="df-eyebrow">After you buy</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            Service &amp; Support
          </h2>
          <p className="mt-2 text-[15.5px] text-ink-400">
            A nationwide RO service network with transparent pricing and genuine spare parts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="df-card df-card-hover group flex flex-col p-6"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-800 transition-colors group-hover:bg-primary-500 group-hover:text-ink-900">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="text-[17px] font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-400">{s.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-primary-700">
                  Learn more
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ blogs */}
      <section className="border-y border-line bg-surface-muted">
        <div className="df-container df-section">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="df-eyebrow">Water knowledge</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
                From the Doctor Fresh Blog
              </h2>
              <p className="mt-2 text-[15.5px] text-ink-400">
                Tips, guides &amp; insights to help you choose, use &amp; maintain the best water purifier.
              </p>
            </div>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
            >
              All articles
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {posts.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <section className="df-container df-section">
        <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-12 md:px-14 md:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-500/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-primary-400/10 blur-3xl"
          />

          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-ink-900 sm:flex">
                <Droplets size={28} aria-hidden="true" />
              </span>
              <div>
                <h2 className="max-w-xl text-[24px] font-semibold leading-tight tracking-tight text-white md:text-[30px]">
                  Not sure which purifier suits your water?
                </h2>
                <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/65">
                  Talk to a Doctor Fresh water expert — free consultation, honest recommendation
                  based on your actual water quality.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <a
                href={`tel:${brand.phoneRaw}`}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15.5px] font-semibold text-ink-900 transition-colors hover:bg-primary-400"
              >
                <Phone size={17} aria-hidden="true" />
                Call {brand.phone}
              </a>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 text-[15.5px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/5"
              >
                Request a callback
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

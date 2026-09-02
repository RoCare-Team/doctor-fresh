import Link from 'next/link';
import { cookies } from 'next/headers';
import Image from 'next/image';
import {
  ArrowRight, Phone, Droplets, Flame,
} from 'lucide-react';
import Hero from '@/components/home/Hero';
import TrustBadges from '@/components/home/TrustBadges';
import CategoryTiles from '@/components/home/CategoryTiles';
import WaterTestSection from '@/components/home/WaterTestSection';
import ProductRail from '@/components/products/ProductRail';
import BlogCard from '@/components/blogs/BlogCard';
import HomeColumns from '@/components/home/HomeColumns';
import DealSlider from '@/components/home/DealSlider';
import Reveal from '@/components/common/Reveal';
import {
  getProductsByIds, getAllBlogPosts, getCategoryImage, getHomeSections, getBrand,
} from '@/lib/catalog';
// Layout copy the database does not hold: which badges the theme shows and
// the water-test panel. Everything else on this page comes from the catalogue.
import { trustBadges, waterTest, homeMeta } from '@/data/site';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
// Recently Viewed is read from this visitor's cookie, so the page is rendered
// per request. Everything on it still comes from the cached catalogue, so
// that costs a render rather than a round of database queries.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return metaFor({
    title: homeMeta.title,
    description: homeMeta.description,
    path: '/',
  });
}

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

/** The handful of fields the small cards need — not the whole product. */
const cardFields = (p) => ({
  id: p.id,
  name: p.name,
  url: p.url,
  image: p.images?.[0] || null,
  price: p.price,
  mrp: p.mrp,
  category: p.category?.name || '',
});

export default async function HomePage() {
  const brand = await getBrand();
  const { rails, todaysDeal, categoryTiles, latest, mostViewed } = await getHomeSections();
  const deals = (await getProductsByIds(todaysDeal)).slice(0, 4);
  const posts = (await getAllBlogPosts()).slice(0, 3);

  // give every category tile a real product photo (the stored icons are 62px)
  const tiles = await Promise.all(
    categoryTiles.map(async (t) => ({ ...t, image: await getCategoryImage(t.href) })),
  );

  // rails are resolved up front so the JSX below stays a plain render
  const railProducts = await Promise.all(rails.map((r) => getProductsByIds(r.productIds)));
  // What this visitor last looked at, from the cookie the product pages set.
  const recentIds = String((await cookies()).get('df_recent')?.value || '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 3);

  const [latestProducts, mostViewedProducts, recentProducts] = await Promise.all([
    getProductsByIds(latest),
    getProductsByIds(mostViewed),
    getProductsByIds(recentIds),
  ]);

  // getProductsByIds makes no promise about order, and newest-first is the point.
  const byId = new Map(recentProducts.map((p) => [p.id, p]));
  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean);

  return (
    <>
      <Hero />

      <TrustBadges badges={trustBadges} />

      {/* ---------------------------------------------------- today's deal */}
      {deals.length ? (
        <section className="df-container df-section">
          {/* the whole block sits inside one promotional banner */}
          <Reveal className="relative overflow-hidden rounded-2xl bg-ink-900 px-5 py-8 md:px-10 md:py-11">
            {/* campaign artwork; the product and TODAY'S DEAL tag sit on its
                right, so the copy keeps to the left half */}
            <Image
              src="/images/topdeal.png"
              alt=""
              fill
              priority={false}
              sizes="(max-width: 1024px) 100vw, 1250px"
              aria-hidden="true"
              className="pointer-events-none select-none object-cover object-right"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/75 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 right-[-4rem] h-80 w-80 rounded-full bg-primary-400/12 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(var(--color-primary-300)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top_left,black_0%,transparent_70%)]"
            />

            <div className="relative">
              <div className="max-w-full lg:max-w-[620px]">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-primary-400">
                  <Flame size={14} aria-hidden="true" />
                  Limited period
                </p>

                {/* heading and the link share one line so the block stays short */}
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h2 className="text-[26px] font-semibold tracking-tight text-white md:text-[32px]">
                    Today&rsquo;s Deal
                  </h2>
                  <Link
                    href="/all-category"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 px-3.5 text-[13px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/5"
                  >
                    View all
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>

                <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-white/60">
                  Best prices of the day on Doctor Fresh bestsellers
                </p>

                <div className="mt-6">
                  <DealSlider deals={deals} />
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      <CategoryTiles tiles={tiles} />

      <WaterTestSection waterTest={waterTest} />

      {/* --------------------------------------------------- product rails */}
      {rails.map((rail, i) => (
        <ProductRail
          key={rail.title}
          title={rail.title}
          eyebrow={RAIL_COPY[rail.title]?.eyebrow}
          subtitle={RAIL_COPY[rail.title]?.subtitle}
          href={rail.href}
          products={railProducts[i]}
          tone={i % 2 === 1 ? 'muted' : 'plain'}
        />
      ))}


      <HomeColumns
        latest={latestProducts.map(cardFields)}
        recent={recent.map(cardFields)}
        mostViewed={mostViewedProducts.map(cardFields)}
      />

      {/* ------------------------------------------------------------ blogs */}
      <section className="border-y border-line bg-surface-muted">
        <div className="df-container df-section">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <Reveal className="max-w-2xl">
              <p className="df-eyebrow">Water knowledge</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
                From the Doctor Fresh Blog
              </h2>
              <p className="mt-2 text-[15.5px] text-ink-400">
                Tips, guides &amp; insights to help you choose, use &amp; maintain the best water purifier.
              </p>
            </Reveal>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
            >
              All articles
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={i * 80} className="h-full">
                <BlogCard post={p} />
              </Reveal>
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
              <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white sm:flex">
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
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15.5px] font-semibold text-white transition-colors hover:bg-ink-900"
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

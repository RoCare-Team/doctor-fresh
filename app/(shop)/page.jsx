import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  ArrowRight, Flame,
} from 'lucide-react';
import ExpertCta from '@/components/home/ExpertCta';
import Hero from '@/components/home/Hero';
import TrustBadges from '@/components/home/TrustBadges';
import CategoryTiles from '@/components/home/CategoryTiles';
import ServiceCards from '@/components/home/ServiceCards';
import BrandStrip from '@/components/home/BrandStrip';
import WaterTestSection from '@/components/home/WaterTestSection';
import ProductRail from '@/components/products/ProductRail';
import BlogCard from '@/components/blogs/BlogCard';
import HomeColumns from '@/components/home/HomeColumns';
import DealSlider from '@/components/home/DealSlider';
import Reveal from '@/components/common/Reveal';
import QuickLinks from '@/components/home/QuickLinks';
import { quickLinksForHome } from '@/lib/sql/quick-links';
import { getHomeContent, getContent } from '@/lib/sql/site-content';
import {
  getProductsByIds, getAllBlogPosts, getCategoryImage, getHomeSections, getBrand,
  cardProduct, getAllProducts,
} from '@/lib/catalog';
// Layout copy the database does not hold: which badges the theme shows and
// the water-test panel. Everything else on this page comes from the catalogue.
import { trustBadges, waterTest, homeMeta } from '@/data/site';
import { metaFor } from '@/lib/utils';

// The same page for everyone, so it is served from the CDN and rebuilt in the
// background every 15 minutes (and at once when the home page, site content or
// quick links are saved in the admin). Recently Viewed is the only per-visitor
// part; the browser fetches it after the page is shown (HomeColumns).
export const revalidate = 900;

export async function generateMetadata() {
  // Edited in the admin (Home page); the built-in copy until then.
  const home = await getHomeContent().catch(() => null);
  return metaFor({
    title: home?.metaTitle || homeMeta.title,
    description: home?.metaDescription || homeMeta.description,
    keywords: home?.keywords,
    image: home?.ogImage,
    path: '/',
  });
}

// What a business buys rather than a household: whole categories of plants
// and machines, plus the commercial ranges inside home categories.
const COMMERCIAL_CATEGORIES = new Set([
  '/category/ro-plant',
  '/category/dm-plant',
  '/category/sewage-treatment-plant-stp',
  '/category/effluent-treatment-plant-etp',
  '/category/swimming-pool-filtration-plant',
  '/category/water-atm',
  '/category/water-chiller',
  '/category/water-cooler',
]);
const COMMERCIAL_SUBCATEGORIES = [
  '/category/water-softener/commercial-water-softener',
  '/category/vacuum-cleaner/vacuum-cleaner-for-industrial',
];
const DEAL_COUNT = 12;

const isCommercial = (p) => COMMERCIAL_CATEGORIES.has(p.category?.href)
  || COMMERCIAL_SUBCATEGORIES.some((href) => p.subcategoryHrefs?.includes(href));

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
  const [brand, sections] = await Promise.all([
    getBrand(),
    // Trust badges, the water test band and the phone highlights (Site content).
    getContent('home_sections').catch(() => null),
  ]);
  const { rails, todaysDeal, categoryTiles, latest, mostViewed } = await getHomeSections();
  // Up to twelve deals fill the slider, four on screen at a time — commercial
  // products only (plants, ATMs, coolers; the home range has the hero and its
  // own rails). When the admin has marked fewer, the gap is topped up with the
  // biggest real discounts on in-stock commercial products.
  const marked = (await getProductsByIds(todaysDeal)).filter(isCommercial);
  const topUp = marked.length >= DEAL_COUNT ? [] : (await getAllProducts())
    .filter((p) => isCommercial(p) && p.inStock && p.price && p.discountPercent > 0 && !marked.some((m) => m.id === p.id))
    .sort((a, b) => b.discountPercent - a.discountPercent);
  const deals = [...marked, ...topUp].slice(0, DEAL_COUNT).map(cardProduct);
  const posts = (await getAllBlogPosts()).slice(0, 3);

  const heroTiles = [
    // Our own Doctor Fresh RO, rather than whichever product the category lists first.
    { label: 'Water Purifier for Home', href: '/category/water-purifier', image: '/images/hero-ro-purifier.png' },
    // Only things a household buys; each points at its "for home" range so
    // the photo is a home model, not a commercial one.
    { label: 'Bathroom Softener for Home', href: '/category/water-softener/water-softener-for-bathroom' },
    { label: 'Water Ionizer for Home', href: '/category/water-ionizer/water-ionizer-for-home' },
    { label: 'Water Dispenser for Home', href: '/category/water-dispenser/table-top' },
    { label: 'Geyser for Home', href: '/category/water-heater/electric-geyser' },
    { label: 'Air Purifier for Home', href: '/category/air-purifier/air-purifier-for-home' },
    { label: 'Vegetable Purifier for Home', href: '/category/vegetable-purifier/vegetablefruit-purifier-for-home' },
    { label: 'Vacuum Cleaner for Home', href: '/category/vacuum-cleaner/vacuum-cleaner-for-home' },
    { label: 'Tap Water Purifier for Home', href: '/category/water-purifier/tap-water-purifier' },
  ];

  // Each tile takes the first product photo of the category it opens.
  const heroTilesWithPhotos = await Promise.all(
    heroTiles.map(async (t) => ({ ...t, image: t.image || await getCategoryImage(t.href) })),
  );


  // give every category tile a real product photo (the stored icons are 62px)
  const tiles = await Promise.all(
    categoryTiles.map(async (t) => ({ ...t, image: await getCategoryImage(t.href) })),
  );



  // rails are resolved up front so the JSX below stays a plain render
  const railProducts = (await Promise.all(rails.map((r) => getProductsByIds(r.productIds))))
    .map((list) => list.map(cardProduct));
  const [latestProducts, mostViewedProducts, quickLinks] = await Promise.all([
    getProductsByIds(latest),
    getProductsByIds(mostViewed),
    // Sections made in the admin; nothing is shown until one exists.
    quickLinksForHome().catch(() => []),
  ]);


  return (
    <div className="df-home">
      <Hero tiles={heroTilesWithPhotos} />

      <TrustBadges badges={sections?.trustBadges?.length ? sections.trustBadges : trustBadges} />

      {/* ---------------------------------------------------- today's deal */}
      {deals.length ? (
        <section className="df-container df-section">
          {/* inset like the cards below, which leave their gutters to the arrows */}
          <Reveal className="mb-3 flex flex-wrap sm:mb-4 items-end justify-between gap-4 md:mb-5">
            <div className="max-w-2xl">
              {/* the heading, with how long the offer runs beside it */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
                  Today&rsquo;s <span className="text-primary-600">Commercial</span> Deals
                </h2>
                <span className="hidden items-center gap-1 rounded-full sm:inline-flex border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#c2410c]">
                  <Flame size={13} aria-hidden="true" />
                  Limited period
                </span>
              </div>
              <p className="mt-1 hidden text-[14.5px] text-ink-400 sm:block">
                Best prices on commercial RO plants, water ATMs, chillers, coolers and industrial systems for your business.
              </p>
            </div>
            <Link
              href="/all-category"
              className="group hidden items-center gap-1.5 rounded-full sm:inline-flex border border-line-strong bg-white px-4 py-2 text-[14px] font-semibold text-ink-900 transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              View all deals
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

          <DealSlider deals={deals} />
        </section>
      ) : null}

      <CategoryTiles tiles={tiles} />

      <BrandStrip brands={sections?.brands || []} />

      <WaterTestSection
        waterTest={sections ? {
          ...waterTest,
          title: sections.waterTitle || waterTest.title,
          formTitle: sections.waterFormTitle || waterTest.formTitle,
          parameters: sections.waterParameters?.length ? sections.waterParameters : waterTest.parameters,
        } : waterTest}
      />

      {/* --------------------------------------------------- product rails */}
      {rails.map((rail, i) => (
        <ProductRail
          key={rail.title}
          title={rail.title}
          href={rail.href}
          products={railProducts[i]}
          tone={i % 2 === 1 ? 'muted' : 'plain'}
        />
      ))}


      <HomeColumns
        latest={latestProducts.map(cardFields)}
        mostViewed={mostViewedProducts.map(cardFields)}
      />

      {/* ------------------------------------------------------------ blogs */}
      <section className="hidden border-y border-line sm:block">
        <div className="df-container df-section">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
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

          <div className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 max-md:[contain:paint] md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={i * 80} className="h-full w-[82%] shrink-0 snap-start sm:w-[46%] md:w-auto">
                <BlogCard post={p} compact />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <ExpertCta phone={brand.phone} phoneRaw={brand.phoneRaw} />

      <ServiceCards />

      <QuickLinks sections={quickLinks} />
    </div>
  );
}

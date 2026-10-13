// GET /api/mobile/home — everything the app's home screen shows, in the
// order the website's home page shows it (app/(shop)/page.jsx):
//
//   { ok, brand, hero: { heading, phrases, tiles }, deals, categoryTiles,
//     waterTest, rails: [{ title, href, products }], latest, mostViewed,
//     services }
//
// Read-only. The selection rules are the home page's own, so the app and the
// site list the same products.

import {
  getProductsByIds, getCategoryImage, getHomeSections, getBrand, getAllProducts,
} from '@/lib/catalog';
import { getContent } from '@/lib/sql/site-content';
import { waterTest } from '@/data/site';
import {
  img, mobileCard, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

// The home page's "commercial" rule for the deals slider.
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

const HERO_TILES = [
  { label: 'Water Purifier for Home', href: '/category/water-purifier', image: '/images/hero-ro-purifier.png' },
  { label: 'Water Ionizer for Home', href: '/category/water-ionizer/water-ionizer-for-home' },
  { label: 'Bathroom Softener for Home', href: '/category/water-softener/water-softener-for-bathroom' },
  { label: 'Water Dispenser for Home', href: '/category/water-dispenser/table-top' },
  { label: 'Air Purifier for Home', href: '/category/air-purifier/air-purifier-for-home' },
  { label: 'Vegetable Purifier for Home', href: '/category/vegetable-purifier/vegetablefruit-purifier-for-home' },
  { label: 'Tap Water Purifier for Home', href: '/category/water-purifier/tap-water-purifier' },
  { label: 'Geyser for Home', href: '/category/water-heater/electric-geyser' },
  { label: 'Vacuum Cleaner for Home', href: '/category/vacuum-cleaner/vacuum-cleaner-for-home' },
];

const HERO_PHRASES = [
  'right at your doorstep',
  'for every Indian home',
  'tested by water experts',
  'serviced within 24 hours',
];

const SERVICES = [
  {
    title: 'Routine Service', description: 'A serviced purifier cleans better and lasts longer. Filters checked, cleaned and replaced.',
    points: ['Filters checked & cleaned', 'Any brand, any model'], cta: 'Book a service', href: '/water-purifier-service',
  },
  {
    title: 'Repair Service', description: 'Not purifying, leaking or making noise? A trained technician comes and fixes it.',
    points: ['Diagnosis at your doorstep', 'Service within 24 hours'], cta: 'Book a repair', href: '/water-purifier-service',
  },
  {
    title: 'Water Purifier AMC', description: 'One yearly plan instead of a bill every time something goes wrong.',
    points: ['Planned service visits', 'One yearly price'], cta: 'See AMC plans', href: '/water-purifier-amc',
  },
  {
    title: 'Installation & Uninstallation', description: 'Fitted where it belongs, or taken off the wall safely when you move.',
    points: ['Certified technicians', 'Safe wall mounting'], cta: 'Book installation', href: '/water-purifier-installation',
  },
];

export async function GET() {
  try {
    await readyMedia();

    const [brand, sections, hero] = await Promise.all([
      getBrand(),
      getContent('home_sections').catch(() => null),
      getContent('hero').catch(() => null),
    ]);
    const {
      rails, todaysDeal, categoryTiles, latest, mostViewed,
    } = await getHomeSections();

    const marked = (await getProductsByIds(todaysDeal)).filter(isCommercial);
    const topUp = marked.length >= DEAL_COUNT ? [] : (await getAllProducts())
      .filter((p) => isCommercial(p) && p.inStock && p.price && p.discountPercent > 0 && !marked.some((m) => m.id === p.id))
      .sort((a, b) => b.discountPercent - a.discountPercent);
    const deals = [...marked, ...topUp].slice(0, DEAL_COUNT).map(mobileCard);

    const heroTiles = hero?.tiles?.length ? hero.tiles : HERO_TILES;
    const tiles = await Promise.all(heroTiles.map(async (t) => ({
      label: t.label,
      href: t.href,
      image: img(t.image || await getCategoryImage(t.href)),
    })));

    const categories = await Promise.all(categoryTiles.map(async (t) => ({
      label: t.label,
      href: t.href,
      image: img(await getCategoryImage(t.href)),
    })));

    const railProducts = await Promise.all(rails.map((r) => getProductsByIds(r.productIds)));
    const [latestProducts, mostViewedProducts] = await Promise.all([
      getProductsByIds(latest),
      getProductsByIds(mostViewed),
    ]);

    return ok({
      brand: {
        name: brand.name,
        logo: img(brand.logo),
        phone: brand.phone,
        phoneRaw: brand.phoneRaw,
        email: brand.email,
        website: brand.website,
        whatsapp: brand.whatsapp,
        about: brand.about,
        offices: brand.offices,
        social: brand.social,
      },
      hero: {
        heading: hero?.headingLead || 'Pure water,',
        phrases: hero?.phrases?.length ? hero.phrases : HERO_PHRASES,
        tiles,
      },
      deals,
      categoryTiles: categories,
      waterTest: {
        ...waterTest,
        title: sections?.waterTitle || waterTest.title,
        formTitle: sections?.waterFormTitle || waterTest.formTitle,
        parameters: (sections?.waterParameters?.length ? sections.waterParameters : waterTest.parameters)
          .map((p) => ({ ...p, icon: img(p.icon) })),
        image: img('/images/banner17.png'),
      },
      rails: rails.map((r, i) => ({
        title: r.title,
        href: r.href || '',
        products: railProducts[i].map(mobileCard),
      })),
      latest: latestProducts.map(mobileCard),
      mostViewed: mostViewedProducts.map(mobileCard),
      services: SERVICES,
    });
  } catch (err) {
    return unavailable(err, 'home');
  }
}

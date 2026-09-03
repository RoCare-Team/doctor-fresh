import { notFound } from 'next/navigation';
import LandingPage from '@/components/services/LandingPage';
import {
  getLandingPage, getLandingRoutes, getNearbyPages, getProductsByIds, getBrand, cardProduct,
} from '@/lib/catalog';
import { getFormOptions } from '@/lib/sql/forms';
import ServiceBooking from '@/components/services/ServiceBooking';
import {
  getServices, getStates, SERVICE_GROUPS, PREMISES,
} from '@/lib/services/wizard';
import { metaFor, SITE_URL } from '@/lib/utils';

/**
 * Every flat SEO URL of the site is served from here:
 *
 *   /water-purifier-service          (national service pages)
 *   /water-purifier-amc
 *   /ro-service-mumbai               (22,195 rows in `landing_pages`)
 *   /water-purifier-abhanpur …
 *
 * Each page is one row of that table, with its own copy, meta tags, FAQs and
 * featured products. The busiest slice is prerendered; the long tail renders on
 * demand so the build stays workable while every published URL keeps working.
 *
 * A slug with no published row renders the not-found page — the live site
 * sends those to its 404 page too.
 */

// Which pages offer a bookable visit rather than only reading as an article.
const BOOKABLE = /RO Service|AMC|Installation|Water Softener Service|RO Plant Service/i;

// Rebuilt in the background so edits in the admin panel appear without a deploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getLandingRoutes()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getLandingPage(slug);
  if (!page) return {};

  return metaFor({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/${slug}`,
    image: page.image,
  });
}

export default async function FlatSlugPage({ params }) {
  const { slug } = await params;

  const page = await getLandingPage(slug);
  if (!page) notFound();

  const [productRows, nearby, brand, formOptions] = await Promise.all([
    getProductsByIds(page.productIds),
    getNearbyPages(page, 24),
    getBrand(),
    getFormOptions(),
  ]);

  const products = productRows.map(cardProduct);

  // Service pages book a visit through the RO Care service system; product
  // pages (RO plants, softeners) do not.
  const booksService = BOOKABLE.test(page.serviceType || '');
  const [services, states] = booksService
    ? await Promise.all([getServices(), getStates()])
    : [null, []];

  const place = page.locality || page.city;
  const showPlace = place && place.toLowerCase() !== 'india';

  const breadcrumb = showPlace && page.serviceType
    ? [{ name: page.serviceType, href: `/${slug}` }, { name: place, href: `/${slug}` }]
    : [{ name: page.linkLabel || page.heading, href: `/${slug}` }];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${brand.name} — ${page.linkLabel || page.heading}`,
    url: `${SITE_URL}/${slug}`,
    telephone: brand.phone,
    email: brand.email,
    ...(showPlace
      ? {
        areaServed: { '@type': 'Place', name: page.schemaCity || place },
        address: {
          '@type': 'PostalAddress',
          addressLocality: page.schemaCity || place,
          ...(page.state ? { addressRegion: page.state } : {}),
          addressCountry: 'IN',
        },
      }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {services?.length ? (
        <ServiceBooking
          services={services}
          groups={SERVICE_GROUPS.map(({ id, label }) => ({ id, label }))}
          states={states}
          premises={PREMISES}
          path={`/${slug}`}
        />
      ) : null}

      <LandingPage
        page={page}
        products={products}
        nearby={nearby}
        breadcrumb={breadcrumb}
        brand={brand}
        formOptions={formOptions}
      />
    </>
  );
}

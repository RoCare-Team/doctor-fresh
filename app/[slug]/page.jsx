import { notFound } from 'next/navigation';
import ServicePage from '@/components/services/ServicePage';
import {
  getServicePage,
  getServicePageSlugs,
  resolveLocationSlug,
  getNearbyLocations,
  humanizeLocation,
} from '@/lib/catalog';
import { getLocationSlugs } from '@/data/locations';
import { fill, metaFor, SITE_URL } from '@/lib/utils';

/**
 * Every flat SEO URL of the existing site is served from here:
 *
 *   /water-purifier-service          (national service page)
 *   /water-purifier-installation
 *   /water-purifier-amc
 *   /ro-service-kanchipurum          (21,400 location pages)
 *   /water-purifier-mumbai
 *   /ro-plant-hyderabad
 *   /water-softener-tohana …
 *
 * The most visited pages are prerendered; the long tail renders on demand so
 * the build stays fast while every existing URL keeps working.
 */

const FAMILY_LABEL = {
  'ro-service': 'RO Service',
  'water-purifier': 'Water Purifier',
  'ro-plant': 'RO Plant',
  'water-softener': 'Water Softener',
  'water-ionizer': 'Water Ionizer',
  'water-cooled-chiller': 'Water Chiller',
  'water-atm-machine-manufacturers': 'Water ATM',
  'dm-plant-manufacturers': 'DM Plant',
  'effluent-treatment-plant-manufacturers': 'Effluent Treatment Plant',
  'sewage-treatment-plant-manufacturers': 'Sewage Treatment Plant',
};

const PRERENDER_PER_FAMILY = 40;

export function generateStaticParams() {
  const params = getServicePageSlugs().map((slug) => ({ slug }));
  for (const key of Object.keys(FAMILY_LABEL)) {
    for (const loc of getLocationSlugs(key).slice(0, PRERENDER_PER_FAMILY)) {
      params.push({ slug: `${key}-${loc}` });
    }
  }
  return params;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const fixed = getServicePage(slug);
  if (fixed) {
    return metaFor({
      title: fill(fixed.metaTitle, 'India'),
      description: fill(fixed.metaDescription, 'India'),
      path: `/${slug}`,
    });
  }

  const resolved = resolveLocationSlug(slug);
  if (!resolved) return {};

  return metaFor({
    title: fill(resolved.template.metaTitle, resolved.locationName),
    description: fill(resolved.template.metaDescription, resolved.locationName),
    path: `/${slug}`,
  });
}

export default async function FlatSlugPage({ params }) {
  const { slug } = await params;

  /* ------------------------------------------------ national service pages */
  const fixed = getServicePage(slug);
  if (fixed) {
    return (
      <ServicePage
        template={fixed}
        location="India"
        breadcrumb={[{ name: fill(fixed.heading, 'India'), href: `/${slug}` }]}
      />
    );
  }

  /* ---------------------------------------------------- location SEO pages */
  const resolved = resolveLocationSlug(slug);
  if (!resolved) notFound();

  const label = FAMILY_LABEL[resolved.key] || 'Service';
  const nearby = getNearbyLocations(resolved.key, resolved.locationSlug, 24)
    .map((s) => ({ slug: s, name: humanizeLocation(s) }));

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Doctor Fresh ${label} — ${resolved.locationName}`,
    url: `${SITE_URL}/${slug}`,
    telephone: '+91-9311587716',
    email: 'info@doctorfresh.in',
    areaServed: { '@type': 'Place', name: resolved.locationName },
    address: { '@type': 'PostalAddress', addressLocality: resolved.locationName, addressCountry: 'IN' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5', ratingCount: '2500000' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <ServicePage
        template={resolved.template}
        location={resolved.locationName}
        breadcrumb={[
          { name: label, href: `/${resolved.key === 'ro-service' ? 'water-purifier-service' : slug}` },
          { name: resolved.locationName, href: `/${slug}` },
        ]}
        nearby={nearby}
        nearbyPrefix={resolved.key}
        nearbyTitle={`${label} in nearby locations`}
      />
    </>
  );
}

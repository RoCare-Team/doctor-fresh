import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/components/cart/CartProvider';
import RequestWizardTrigger from '@/components/forms/RequestWizardTrigger';
import { getBrand } from '@/lib/catalog';
import { homeMeta } from '@/data/site';
import { SITE_URL, imageUrl } from '@/lib/utils';

/**
 * The site-wide fallback. Every page sets its own title and description, so
 * this only shows on the error pages — but `general_settings.system_title` and
 * `meta_description` still hold the installer's placeholders ("Doctor Fresh",
 * "Meta Des"), which the live site never renders either. The home page copy is
 * the honest default, so it is what is used here too.
 */
export async function generateMetadata() {
  const brand = await getBrand();

  return {
    title: {
      default: homeMeta.title,
      template: `%s | ${brand.name}`,
    },
    description: homeMeta.description,
    applicationName: brand.name,
    // From `general_settings`: meta_keywords, meta_author. Every page keeps its
    // own keywords; these are the fallback for pages that carry none.
    keywords: brand.keywords
      ? brand.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : undefined,
    authors: brand.author ? [{ name: brand.author }] : undefined,
    publisher: brand.name,
    icons: {
      icon: imageUrl(brand.favicon),
      apple: imageUrl(brand.favicon), // home-screen icon on iOS
    },
    openGraph: { siteName: brand.name, type: 'website', locale: 'en_IN' },
    twitter: { card: 'summary_large_image', site: '@DoctorFreshIN' },
  };
}

export default async function ShopLayout({ children }) {
  const brand = await getBrand();

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: SITE_URL,
    logo: `${SITE_URL}${brand.logo}`,
    email: brand.email,
    telephone: brand.phone,
    ...(brand.address
      ? { address: { '@type': 'PostalAddress', streetAddress: brand.address, addressCountry: 'IN' } }
      : {}),
    sameAs: brand.social.map((s) => s.href),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <CartProvider>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <RequestWizardTrigger />
      </CartProvider>
    </>
  );
}

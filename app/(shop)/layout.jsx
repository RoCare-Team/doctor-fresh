import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/components/cart/CartProvider';
import { getBrand } from '@/lib/catalog';
import { SITE_URL, imageUrl } from '@/lib/utils';

/** Title, description and icon all come from `general_settings`. */
export async function generateMetadata() {
  const brand = await getBrand();

  return {
    title: {
      default: brand.title || brand.name,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline,
    applicationName: brand.name,
    icons: { icon: imageUrl(brand.favicon) },
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
      </CartProvider>
    </>
  );
}

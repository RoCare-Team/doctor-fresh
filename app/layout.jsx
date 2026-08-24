import { Inter } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/components/cart/CartProvider';
import { brand } from '@/data/site';
import { SITE_URL, SITE_INDEXABLE, imageUrl } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: brand.homeTitle,
    template: '%s | Doctor Fresh',
  },
  description: brand.tagline,
  applicationName: 'Doctor Fresh',
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  icons: { icon: imageUrl(brand.favicon) },
  openGraph: {
    siteName: 'Doctor Fresh',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', site: '@DoctorFreshIN' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1597c5',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Doctor Fresh',
  url: SITE_URL,
  logo: `${SITE_URL}${brand.logo}`,
  email: brand.email,
  telephone: brand.phone,
  address: brand.offices.map((o) => ({ '@type': 'PostalAddress', streetAddress: o.address, addressCountry: 'IN' })),
  sameAs: brand.social.map((s) => s.href),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

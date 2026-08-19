import { SITE_URL } from '@/lib/utils';

// Mirrors the existing robots.txt of www.doctorfresh.in so crawl rules are
// unchanged. The XML sitemaps continue to be served by the existing backend.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: [
          '/home/quick_view/',
          '/legal/',
          '/request/form/submit.php',
          '/amazon.php',
          '/infos.php',
          '/trust.php',
          '/config/',
          '/core/',
          '/db/',
          '/includes/',
          '/backup/',
          '/private/',
          '/tmp/',
          '/logs/',
          '/admin/',
          '/cgi-bin/',
          '/cart/',
          '/cart-checkout/',
          '/search/',
          '/login/',
          '/registration/',
          '/thank-you/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

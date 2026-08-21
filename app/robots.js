import { SITE_URL, SITE_INDEXABLE } from '@/lib/utils';

/**
 * While the site is not indexable (staging, previews) everything is blocked.
 * With NEXT_PUBLIC_SITE_INDEXABLE=true it serves the same rules the live
 * doctorfresh.in robots.txt uses today.
 */
export default function robots() {
  if (!SITE_INDEXABLE) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

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

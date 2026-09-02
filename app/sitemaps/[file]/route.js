// GET /sitemaps/<name>.xml — one child sitemap.
//
// The names are the ones the live PHP site already publishes, so the sitemaps
// Search Console has on file keep resolving after the cutover.

import { SITE_INDEXABLE } from '@/lib/utils';
import {
  LANDING_SITEMAPS, SITEMAP_FILES,
  mainEntries, productEntries, blogEntries, landingEntries,
  urlsetXml, xmlResponse,
} from '@/lib/sitemap';

export const revalidate = 3600;

/** Prebuilt at deploy time; the rest of the site's routes work the same way. */
export function generateStaticParams() {
  return SITEMAP_FILES.map((file) => ({ file: `${file}.xml` }));
}

async function entriesFor(name) {
  if (name === 'main-sitemap') return mainEntries();
  if (name === 'products') return productEntries();
  if (name === 'blogs') return blogEntries();

  const group = LANDING_SITEMAPS.find((g) => g.file === name);
  return group ? landingEntries(group) : undefined;
}

export async function GET(request, { params }) {
  if (!SITE_INDEXABLE) return new Response('Not found', { status: 404 });

  const { file } = await params;
  const entries = await entriesFor(String(file).replace(/\.xml$/, ''));

  if (entries === undefined) return new Response('Not found', { status: 404 });

  // The query failed. Answering 503 asks the crawler to come back, whereas an
  // empty <urlset> would tell it several thousand URLs had been withdrawn.
  if (entries === null) {
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'retry-after': '600' },
    });
  }

  return xmlResponse(urlsetXml(entries));
}

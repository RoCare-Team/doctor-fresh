// GET /sitemap.xml — the sitemap index robots.txt points at.
//
// Only the list of child sitemaps, no counting query: the database account is
// shared with the live PHP site and capped at 30 connections, and an index
// carries no information a crawler cannot get from the children themselves.

import { SITE_INDEXABLE } from '@/lib/utils';
import { SITEMAP_FILES, sitemapIndexXml, xmlResponse } from '@/lib/sitemap';

export const revalidate = 3600;

export async function GET() {
  // Staging and preview deployments disallow everything in robots.txt; a
  // reachable sitemap there would undo that.
  if (!SITE_INDEXABLE) return new Response('Not found', { status: 404 });

  return xmlResponse(sitemapIndexXml(SITEMAP_FILES));
}

// Database connectivity check.
//
// GET /api/health reports whether the app is reading from the SQL database or
// from the bundled fallback data. Useful right after credentials are added, to
// confirm the connection without having to inspect a page.

import { ping, isDbEnabled } from '@/lib/db';
import { getProductsFromDb, getCategoriesFromDb, getBlogsFromDb } from '@/lib/sql/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connection = await ping();

  const [products, categories, blogs] = await Promise.all([
    getProductsFromDb(),
    getCategoriesFromDb(),
    getBlogsFromDb(),
  ]);

  return Response.json({
    configured: isDbEnabled(),
    connection,
    source: products ? 'sql' : 'static-fallback',
    counts: {
      products: products?.length ?? null,
      categories: categories?.length ?? null,
      blogPosts: blogs?.posts.length ?? null,
    },
  });
}

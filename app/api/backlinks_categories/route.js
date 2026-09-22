// GET /api/backlinks_categories — every product category with its
// subcategories and their addresses, as JSON:
//
//   { success, total_categories, data: [{ category_name, meta_keywords, href,
//     sub_categories: [{ sub_category_name, keyword, subcategory_url }] }] }
//
// Read from the site's own `category` / `sub_category` tables (the same
// catalogue the storefront shows). The category table has no keywords column,
// so a category's meta_keywords are its name plus its subcategories' own
// keywords; a subcategory's keyword is its `keyword` column (its name when
// that is empty).

import { getAllCategories } from '@/lib/catalog';
import { SITE_URL } from '@/lib/utils';

// Read at request time, so a failed read is never frozen into the build; the
// CDN keeps each answer for an hour (Cache-Control below).
export const dynamic = 'force-dynamic';

const HEADERS = {
  // Other sites may read the list, so it is open to any origin.
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

const absolute = (href) => `${SITE_URL}${href}`;

/** "a, b, a ,c" and ["B", "d"] → "a, b, c, d" (first spelling kept). */
function keywordList(...parts) {
  const seen = new Set();
  const out = [];
  for (const part of parts.flat()) {
    for (const word of String(part || '').split(',')) {
      const w = word.trim().replace(/\s+/g, ' ');
      if (w && !seen.has(w.toLowerCase())) {
        seen.add(w.toLowerCase());
        out.push(w);
      }
    }
  }
  return out.join(', ');
}

export async function GET() {
  let categories;
  try {
    categories = await getAllCategories();
  } catch (err) {
    console.error('[api] backlinks_categories:', err.message);
    return Response.json(
      { success: false, total_categories: 0, data: [], message: 'The category list is unavailable right now.' },
      { status: 503, headers: { ...HEADERS, 'Cache-Control': 'no-store' } },
    );
  }

  const data = categories.map((c) => {
    const subs = c.subcategories.map((s) => ({
      sub_category_name: s.name,
      // Some were typed in the admin as "Keywords - …"; the label is not part of it.
      keyword: (s.keywords || s.name).replace(/^\s*keywords?\s*[-:]\s*/i, '') || s.name,
      subcategory_url: absolute(s.href),
    }));
    return {
      category_name: c.name,
      meta_keywords: keywordList(c.name, subs.map((s) => s.keyword)),
      href: absolute(c.href),
      sub_categories: subs,
    };
  });

  return Response.json({ success: true, total_categories: data.length, data }, { headers: HEADERS });
}

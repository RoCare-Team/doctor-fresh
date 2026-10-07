// GET /api/get_blogs — every blog post as a flat JSON array:
//
//   [{ blog_image, blog_keywords, blog_name, blog_title, blog_url,
//      blog_description, blog_date, blog_content_text, blog_cat_id,
//      author_name }, …]
//
// The field names are the ones the other side already reads, kept exactly as
// given, so nothing has to change at their end.
//
// Every row of `blog` is included, as the product list does; `?live=1` leaves
// out the posts that are switched off on the site. The whole list comes back
// in one answer unless `?limit=&page=` asks for it a page at a time, and the
// total is in the `X-Total-Count` header either way.

import { query } from '@/lib/db';
import { blogImage } from '@/lib/sql/media';
import { warmMedia } from '@/lib/blob';
import { strip, delinkDomain } from '@/lib/sql/html';
import { SITE_URL, absoluteUrl, imageUrl } from '@/lib/utils';

// Prices and posts change in the admin; a frozen copy would serve yesterday's.
export const dynamic = 'force-dynamic';

const HEADERS = {
  // Other systems read this list, so it is open to any origin.
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
};

/** A whole number inside its range, or null when it was not asked for. */
function size(value, { min = 1, max = 500 } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const liveOnly = params.get('live') === '1';

  const limit = size(params.get('limit'));
  const page = size(params.get('page')) || 1;
  // `offset` wins when both are given: it says exactly where to start.
  const offset = size(params.get('offset'), { min: 0, max: 1e6 }) ?? (limit ? (page - 1) * limit : 0);

  // Cover images live in Vercel Blob for anything uploaded from the admin.
  await warmMedia().catch(() => {});

  const where = liveOnly ? "WHERE COALESCE(`status`, '') <> '0'" : '';
  const rows = await query(
    `SELECT \`blog_id\`, \`title\`, \`blog_url\`, \`summery\`, \`author\`, \`date\`,
            \`description\`, \`blog_category\`, \`meta_description\`
       FROM \`blog\`
      ${where}
      ORDER BY \`blog_id\` DESC
      ${limit ? 'LIMIT ? OFFSET ?' : ''}`,
    limit ? [limit, offset] : [],
  );

  // A failed read must not look like an empty blog, or whoever imports this
  // would wipe their own list.
  if (rows === null) {
    return Response.json(
      { error: 'The blog list is unavailable right now.' },
      { status: 503, headers: { ...HEADERS, 'Cache-Control': 'no-store' } },
    );
  }

  const counted = limit ? await query(`SELECT COUNT(*) AS \`n\` FROM \`blog\` ${where}`) : null;
  const total = counted ? Number(counted[0]?.n || 0) : rows.length;

  const posts = rows.map((b) => {
    const cover = blogImage(b.blog_id);
    return {
      blog_image: cover ? absoluteUrl(imageUrl(cover)) : '',
      // The stored posts carry no keyword column; the summary is what the
      // site itself uses for search listings, so it stands in rather than
      // inventing words for them.
      blog_keywords: strip(b.meta_description),
      blog_name: b.blog_url || '',
      blog_title: strip(b.title),
      blog_url: `${SITE_URL}/blog/${b.blog_id}/${b.blog_url || ''}`,
      blog_description: strip(b.summery) || strip(b.meta_description),
      blog_date: String(b.date || '').slice(0, 10),
      // Links back to the old domain are rewritten, as they are on the site.
      blog_content_text: delinkDomain(String(b.description || '')),
      blog_cat_id: b.blog_category,
      author_name: strip(b.author),
    };
  });

  return Response.json(posts, {
    headers: {
      ...HEADERS,
      'X-Total-Count': String(total),
      'Access-Control-Expose-Headers': 'X-Total-Count',
    },
  });
}

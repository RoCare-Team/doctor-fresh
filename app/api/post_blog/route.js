// POST /api/post_blog — publish a blog post from outside the admin.
//
// The payload is the one the other side already sends, field for field:
//
//   { blog_image, blog_keywords, blog_name, blog_title, blog_url,
//     blog_description, blog_date, blog_content_text, blog_cat_id,
//     author_name }
//
// `blog_name` is the address the post lives at (…/blog/<id>/<blog_name>);
// `blog_url` is accepted too and the slug is taken from it when `blog_name` is
// missing, so either side of the pair can be sent. `blog_image` is a picture's
// address — it is fetched and stored as this post's cover, exactly as an
// upload from the admin would be.
//
// This writes to the live blog, so unlike the read endpoints it is NOT open:
// every request must carry the shared key.

import { revalidatePath, revalidateTag } from 'next/cache';
import { query, queryOne, mutate } from '@/lib/db';
import { BLOG_TAG } from '@/lib/sql/repository';
import { clearCache } from '@/lib/sql/cache';
import { forgetMedia } from '@/lib/sql/media';
import { UPLOAD_DIRS } from '@/lib/sql/schema';
import { blobEnabled, putPublic, warmMedia } from '@/lib/blob';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const KEY = process.env.BLOG_API_KEY || '';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

const clean = (value, max) => String(value ?? '').trim().slice(0, max);

/** "Best RO Plant in Gurgaon!" → best-ro-plant-in-gurgaon */
const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/https?:\/\/[^/]+\//, '')     // a full address may be sent instead
  .replace(/^.*\/blog\/\d+\//, '')       // …/blog/37/the-slug
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 190);

/** The key, from a header or the body — whichever the caller finds easier. */
function authorised(request, body) {
  if (!KEY) return false;
  const sent = request.headers.get('x-api-key')
    || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    || body?.key
    || '';
  return sent === KEY;
}

/**
 * Saves the picture at `src` as this post's cover.
 *
 * Best-effort on purpose: a picture that cannot be fetched must not cost the
 * post itself, which is already written by the time this runs.
 */
async function saveCover(id, src) {
  if (!src) return '';

  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return '';

    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('image/')) return '';

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return '';

    // The extension follows the picture that came back, because the storefront
    // finds a cover by name: blog_<id>.<ext>.
    const ext = type.includes('png') ? 'png'
      : type.includes('webp') ? 'webp'
        : type.includes('gif') ? 'gif'
          : type.includes('avif') ? 'avif' : 'jpg';

    if (blobEnabled()) {
      const saved = await putPublic(`uploads/blog_image/blog_${id}.${ext}`, buffer, type);
      return saved.url;
    }

    // No Blob store configured (local work): keep it beside the other covers.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.join(process.cwd(), 'public', 'uploads', 'blog_image');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `blog_${id}.${ext}`), buffer);
    return `/uploads/blog_image/blog_${id}.${ext}`;
  } catch {
    return '';
  }
}

/** The blog list, category pages and the post itself are all cached. */
async function refresh() {
  clearCache();
  forgetMedia(UPLOAD_DIRS.blog);
  await warmMedia({ force: true }).catch(() => {});
  try {
    revalidateTag(BLOG_TAG);
    revalidatePath('/blogs', 'layout');
    revalidatePath('/blog/[id]/[slug]', 'page');
  } catch { /* best-effort; the pages refresh on their own schedule */ }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Send the post as JSON.');
  }

  if (!KEY) return fail('Posting is not enabled on this site yet.', 503);
  if (!authorised(request, body)) return fail('Wrong or missing API key.', 401);

  const title = clean(body.blog_title, 500);
  if (!title) return fail('blog_title is required.');

  const slug = slugify(body.blog_name || body.blog_url || title);
  if (!slug) return fail('blog_name could not be read as an address.');

  const content = String(body.blog_content_text ?? '');
  const description = clean(body.blog_description, 5000);
  const keywords = clean(body.blog_keywords, 5000);
  const author = clean(body.author_name, 500);
  const category = Number(body.blog_cat_id) || null;

  // Their date, when it is a date; today in India otherwise.
  const date = /^\d{4}-\d{2}-\d{2}/.test(String(body.blog_date || ''))
    ? String(body.blog_date).slice(0, 10)
    : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // One address, one post: sending the same slug again updates that post
  // rather than leaving two of them at the same place.
  const existing = await queryOne('SELECT `blog_id` FROM `blog` WHERE `blog_url` = ? LIMIT 1', [slug]);

  let id;
  try {
    if (existing) {
      id = Number(existing.blog_id);
      await mutate(
        `UPDATE \`blog\` SET \`title\` = ?, \`summery\` = ?, \`author\` = ?, \`date\` = ?,
                             \`description\` = ?, \`blog_category\` = ?, \`meta_description\` = ?
          WHERE \`blog_id\` = ?`,
        [title, description, author, date, content, category ? String(category) : null, keywords, id],
      );
    } else {
      const result = await mutate(
        `INSERT INTO \`blog\` (\`title\`, \`blog_url\`, \`summery\`, \`author\`, \`date\`, \`description\`,
                               \`status\`, \`blog_category\`, \`number_of_view\`, \`meta_description\`)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
        [title, slug, description, author, date, content, category ? String(category) : null, keywords],
      );
      id = Number(result.insertId);
    }
  } catch (err) {
    console.error('[post_blog] could not save the post:', err.message);
    return fail('Could not save the post.', 502);
  }

  const image = await saveCover(id, clean(body.blog_image, 1000));
  await refresh();

  return Response.json({
    ok: true,
    updated: Boolean(existing),
    blog_id: id,
    blog_name: slug,
    blog_url: `${SITE_URL}/blog/${id}/${slug}`,
    blog_image: image,
  });
}

/** The categories a post can be filed under, so the caller can send a real id. */
export async function GET() {
  const rows = await query(
    'SELECT `blog_category_id`, `name`, `slug_url` FROM `blog_category` ORDER BY `blog_category_id`',
  );
  return Response.json({
    ok: true,
    categories: (rows || []).map((r) => ({
      blog_cat_id: r.blog_category_id,
      name: r.name,
      slug: r.slug_url,
    })),
  });
}

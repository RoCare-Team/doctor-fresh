import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateBlog, createBlog } from '@/lib/sql/admin-catalog';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

/** The blog list, category pages and posts are cached; all are refreshed. */
function refreshBlog() {
  clearCache();
  try {
    revalidatePath('/blogs', 'layout');
    revalidatePath('/blog', 'layout');
  } catch { /* best-effort; the pages refresh on their own schedule */ }
}

export async function PATCH(request) {
  const { response } = await requireAdmin('blogs', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown post.');
  if (body.title !== undefined && !String(body.title).trim()) return fail('Enter a title.');

  let saved;
  try {
    saved = await updateBlog(id, body);
  } catch (err) {
    console.error('[admin] could not save the post:', err.message);
    return fail('Could not save the post.', 502);
  }
  if (saved?.error) return fail(saved.error);

  refreshBlog();
  return Response.json({ ok: true });
}

/** A new post; it opens in the editor afterwards for its body and image. */
export async function POST(request) {
  const { response } = await requireAdmin('blogs', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let created;
  try {
    created = await createBlog(body);
  } catch (err) {
    console.error('[admin] could not create the post:', err.message);
    return fail('Could not create the post.', 502);
  }
  if (created.error) return fail(created.error);

  refreshBlog();
  return Response.json({ ok: true, ...created });
}

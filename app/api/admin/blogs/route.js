import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  updateBlog, createBlog, setBlogLive, deleteBlog,
} from '@/lib/sql/admin-catalog';
import { clearCache } from '@/lib/sql/cache';
import { setBlogVideo, removeBlogVideo } from '@/lib/sql/blog-video';
import { blogCoverUrls, removeBlobs, blobEnabled } from '@/lib/blob';

export const dynamic = 'force-dynamic';

/** The blog list, category pages and posts are cached; all are refreshed. */
function refreshBlog() {
  clearCache();
  try {
    revalidatePath('/blogs', 'layout');
    // The post pages are a dynamic route: the route itself has to be named,
    // or the stored copy of /blog/<id>/<slug> keeps being served for its
    // full five minutes after an edit.
    revalidatePath('/blog/[id]/[slug]', 'page');
  } catch { /* best-effort; the pages refresh on their own schedule */ }
}

export async function PATCH(request) {
  const { response } = await requireAdmin('blogs', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown post.');

  // Off the site / back on it — nothing else changes.
  if (body.live !== undefined && Object.keys(body).length === 2) {
    try {
      await setBlogLive(id, Boolean(body.live));
      refreshBlog();
      return Response.json({ ok: true });
    } catch (err) {
      console.error('[admin] could not change the post visibility:', err.message);
      return fail('Could not save the change.', 502);
    }
  }
  if (body.title !== undefined && !String(body.title).trim()) return fail('Enter a title.');

  let saved;
  try {
    // The video is kept in its own table (see lib/sql/blog-video).
    if (body.videoUrl !== undefined) {
      const video = await setBlogVideo(id, body.videoUrl);
      if (video.error) return fail(video.error);
    }
    saved = await updateBlog(id, body);
  } catch (err) {
    console.error('[admin] could not save the post:', err.message);
    return fail('Could not save the post.', 502);
  }
  if (saved?.error) return fail(saved.error);

  refreshBlog();
  return Response.json({ ok: true });
}

/** The post, its video and its cover picture, for good. */
export async function DELETE(request) {
  const { response } = await requireAdmin('blogs', 'delete');
  if (response) return response;

  const url = new URL(request.url);
  const body = await readJson(request).catch(() => null);
  const id = Number(body?.id || url.searchParams.get('id')) || 0;
  if (!id) return fail('Unknown post.');

  try {
    const done = await deleteBlog(id);
    if (done.error) return fail(done.error);
  } catch (err) {
    console.error('[admin] could not delete the post:', err.message);
    return fail('Could not delete the post.', 502);
  }

  // Best-effort tidying: the post is already gone either way.
  await removeBlogVideo(id).catch(() => {});
  if (blobEnabled()) await removeBlobs(await blogCoverUrls(id)).catch(() => {});

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

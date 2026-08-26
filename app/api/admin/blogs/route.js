import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateBlog } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown post.');
  if (body.title !== undefined && !String(body.title).trim()) return fail('Enter a title.');

  try {
    await updateBlog(id, body);
  } catch (err) {
    console.error('[admin] could not save the post:', err.message);
    return fail('Could not save the post.', 502);
  }

  return Response.json({ ok: true });
}

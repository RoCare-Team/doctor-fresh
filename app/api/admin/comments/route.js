import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { setVisible, deleteItem, replyAsTeam } from '@/lib/sql/admin-comments';
import { getBrand } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** { kind: 'comment'|'reply', id, visible } — show or hide on the site. */
export async function PATCH(request) {
  const { response } = await requireAdmin('comments', 'edit');
  if (response) return response;
  const body = await readJson(request);
  if (!body?.id) return fail('Invalid request.');
  try {
    const result = await setVisible(body.kind, body.id, Boolean(body.visible));
    if (result.error) return fail(result.error);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[admin] could not update the comment:', err.message);
    return fail('Could not save the change.', 502);
  }
}

/** ?kind=comment|reply&id= — a comment goes with its replies. */
export async function DELETE(request) {
  const { response } = await requireAdmin('comments', 'delete');
  if (response) return response;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id')) || 0;
  if (!id) return fail('Invalid request.');
  try {
    const result = await deleteItem(url.searchParams.get('kind'), id);
    if (result.error) return fail(result.error);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[admin] could not delete the comment:', err.message);
    return fail('Could not delete.', 502);
  }
}

/** { commentId, reply, name } — the team answers on the page. */
export async function POST(request) {
  const { response } = await requireAdmin('comments', 'create');
  if (response) return response;
  const body = await readJson(request);
  if (!body?.commentId) return fail('Invalid request.');
  try {
    const brand = await getBrand().catch(() => null);
    const result = await replyAsTeam({
      commentId: body.commentId, text: body.reply, name: body.name, email: brand?.email || '',
    });
    if (result.error) return fail(result.error);
    return Response.json({ ok: true, id: result.id });
  } catch (err) {
    console.error('[admin] could not post the reply:', err.message);
    return fail('Could not post the reply.', 502);
  }
}

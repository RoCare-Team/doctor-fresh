import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateOrderMeta } from '@/lib/sql/order-meta';

export const dynamic = 'force-dynamic';

/**
 * Workflow changes on one or more orders: { ids, patch }.
 * Moving an order to Deleted needs the delete permission; the rest need edit.
 */
export async function PATCH(request) {
  const body = await readJson(request);
  if (!body?.patch) return fail('Invalid request.');
  const { admin, response } = await requireAdmin('orders', body.patch.stage === 'deleted' ? 'delete' : 'edit');
  if (response) return response;

  try {
    const result = await updateOrderMeta(body.ids, body.patch, admin.name);
    if (result.error) return fail(result.error);
    return Response.json({ ok: true, meta: result.meta });
  } catch (err) {
    console.error('[admin] could not update the order:', err.message);
    return fail('Could not save the change.', 502);
  }
}

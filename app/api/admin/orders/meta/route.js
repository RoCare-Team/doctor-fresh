import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateOrderMeta } from '@/lib/sql/order-meta';
import { saveContent } from '@/lib/sql/site-content';

export const dynamic = 'force-dynamic';

/**
 * Workflow changes on one or more orders: { ids, patch }.
 * Moving an order to Deleted needs the delete permission; the rest need edit.
 */
export async function PATCH(request) {
  const body = await readJson(request);

  // { testContacts: [...] } — the phones / emails whose orders count as tests.
  if (Array.isArray(body?.testContacts)) {
    const { response } = await requireAdmin('orders', 'edit');
    if (response) return response;
    try {
      const saved = await saveContent('order_settings', { testContacts: body.testContacts });
      return Response.json({ ok: true, testContacts: saved.value.testContacts });
    } catch (err) {
      console.error('[admin] could not save the test contacts:', err.message);
      return fail('Could not save the change.', 502);
    }
  }

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

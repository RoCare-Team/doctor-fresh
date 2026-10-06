import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateOrderMeta } from '@/lib/sql/order-meta';
import { saveContent } from '@/lib/sql/site-content';
import { logActivity } from '@/lib/sql/activity';

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

    // Written as the board reads it: the stage it was moved to, the courier
    // that was entered, the remark that was added.
    const p = body.patch;
    const said = [
      p.stage ? `moved to ${p.stage}` : '',
      p.isTest !== undefined ? (p.isTest ? 'marked as a test' : 'no longer a test') : '',
      p.courier ? `courier ${p.courier}` : '',
      p.tracking ? `tracking ${p.tracking}` : '',
      p.codCollected !== undefined ? (p.codCollected ? 'cash collected' : 'cash not collected') : '',
      p.remark ? `remark: ${p.remark}` : '',
    ].filter(Boolean).join(', ');
    const ids = [].concat(body.ids || []);
    await logActivity({
      admin,
      section: 'orders',
      action: 'edited',
      targetId: ids.length === 1 ? ids[0] : '',
      target: ids.length === 1 ? `Order ${ids[0]}` : `${ids.length} orders`,
      detail: said,
    });

    return Response.json({ ok: true, meta: result.meta });
  } catch (err) {
    console.error('[admin] could not update the order:', err.message);
    return fail('Could not save the change.', 502);
  }
}

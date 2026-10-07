// Updating an order from the admin area.

import { requireAdmin } from '@/lib/admin/guard';
import { setDeliveryStatus, setPaymentPaid } from '@/lib/sql/admin';
import { logActivity } from '@/lib/sql/activity';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function PATCH(request) {
  const { admin, response } = await requireAdmin('orders', 'edit');
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const saleId = Number(body.saleId);
  if (!saleId) return fail('Unknown order.');

  const changed = [];
  try {
    if (body.delivery !== undefined) {
      const result = await setDeliveryStatus(saleId, body.delivery);
      if (!result.ok) return fail(result.reason);
      changed.push(`delivery → ${body.delivery}`);
    }
    if (body.paid !== undefined) {
      const result = await setPaymentPaid(saleId, Boolean(body.paid));
      if (!result.ok) return fail(result.reason);
      changed.push(body.paid ? 'marked paid' : 'marked unpaid');
    }
  } catch (err) {
    console.error('[admin] could not update the order:', err.message);
    return fail('Could not save the change. Please try again.', 502);
  }

  await logActivity({
    admin,
    section: 'orders',
    action: 'edited',
    targetId: saleId,
    target: `Order ${saleId}`,
    detail: changed.join(', '),
  });

  return Response.json({ ok: true });
}

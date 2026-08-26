// Updating an order from the admin area.

import { getAdminSession } from '@/lib/admin/session';
import { setDeliveryStatus, setPaymentPaid } from '@/lib/sql/admin';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function PATCH(request) {
  const admin = await getAdminSession();
  if (!admin) return fail('Please sign in.', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const saleId = Number(body.saleId);
  if (!saleId) return fail('Unknown order.');

  try {
    if (body.delivery !== undefined) {
      const result = await setDeliveryStatus(saleId, body.delivery);
      if (!result.ok) return fail(result.reason);
    }
    if (body.paid !== undefined) {
      const result = await setPaymentPaid(saleId, Boolean(body.paid));
      if (!result.ok) return fail(result.reason);
    }
  } catch (err) {
    console.error('[admin] could not update the order:', err.message);
    return fail('Could not save the change. Please try again.', 502);
  }

  return Response.json({ ok: true });
}

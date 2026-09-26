// Moving a service booking along: new → confirmed → done, or cancelled.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { setBookingStatus, deleteBooking } from '@/lib/sql/service-bookings';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['new', 'confirmed', 'done', 'cancelled']);

export async function DELETE(request) {
  const { response } = await requireAdmin('service_bookings', 'delete');
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown booking.');

  try {
    const done = await deleteBooking(id);
    if (done.error) return fail(done.error);
  } catch (err) {
    console.error('[admin] could not delete the booking:', err.message);
    return fail('Could not delete the booking.', 502);
  }

  return Response.json({ ok: true });
}

export async function PATCH(request) {
  const { response } = await requireAdmin('service_bookings', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  const status = String(body?.status || '');

  if (!id) return fail('Unknown booking.');
  if (!ALLOWED.has(status)) return fail('That is not a status a booking can have.');

  try {
    const done = await setBookingStatus(id, status);
    if (done.error) return fail(done.error);
  } catch (err) {
    console.error('[admin] could not update the booking:', err.message);
    return fail('Could not save the change.', 502);
  }

  return Response.json({ ok: true });
}

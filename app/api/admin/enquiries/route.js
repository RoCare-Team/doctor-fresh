// Marking an enquiry dealt with.

import { requireAdmin } from '@/lib/admin/guard';
import { markHandled, deleteMessage } from '@/lib/sql/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  // Contact and partner messages have their own section; the rest are enquiries.
  const { response } = await requireAdmin({ message: 'messages', quotation: 'brochures' }[body.kind] || 'enquiries', 'edit');
  if (response) return response;

  try {
    const result = await markHandled(body.kind, Number(body.id), body.handled !== false);
    if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  } catch (err) {
    console.error('[admin] could not update the enquiry:', err.message);
    return Response.json({ ok: false, error: 'Could not save the change.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}

/** Deletes a contact or partner message — for spam. */
export async function DELETE(request) {
  const { response } = await requireAdmin('messages', 'delete');
  if (response) return response;

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return Response.json({ ok: false, error: 'Unknown message.' }, { status: 400 });

  try {
    await deleteMessage(id);
  } catch (err) {
    console.error('[admin] could not delete the message:', err.message);
    return Response.json({ ok: false, error: 'Could not delete the message.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}

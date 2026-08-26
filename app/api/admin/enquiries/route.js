// Marking an enquiry dealt with.

import { getAdminSession } from '@/lib/admin/session';
import { markHandled } from '@/lib/sql/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ ok: false, error: 'Please sign in.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const result = await markHandled(body.kind, Number(body.id), body.handled !== false);
    if (!result.ok) return Response.json({ ok: false, error: result.reason }, { status: 400 });
  } catch (err) {
    console.error('[admin] could not update the enquiry:', err.message);
    return Response.json({ ok: false, error: 'Could not save the change.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}

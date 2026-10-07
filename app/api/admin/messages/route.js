// Moving a contact or partner message along: new → in progress → resolved.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { setMessageStatus } from '@/lib/sql/message-status';
import { messageStatusLabel } from '@/lib/admin/message-status';
import { logActivity } from '@/lib/sql/activity';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { admin, response } = await requireAdmin('messages', 'edit');
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  const status = String(body?.status || '');
  if (!id) return fail('Unknown message.');

  let done;
  try {
    done = await setMessageStatus(id, status, admin?.name);
  } catch (err) {
    console.error('[admin] could not set the message status:', err.message);
    return fail('Could not save the change.', 502);
  }
  if (!done.ok) return fail(done.reason);

  await logActivity({
    admin,
    section: 'messages',
    action: 'edited',
    targetId: id,
    target: String(body.name || `Message ${id}`).trim(),
    detail: `status → ${messageStatusLabel(status)}`,
  });

  return Response.json({ ok: true });
}

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  createAdminUser, updateAdminUser, setAdminActive, deleteAdminUser,
} from '@/lib/sql/admin-users';
import { logActivity } from '@/lib/sql/activity';

export const dynamic = 'force-dynamic';

async function run(work, label) {
  try {
    const result = await work();
    if (result?.error) return fail(result.error);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[admin] could not ${label}:`, err.message);
    return fail(`Could not ${label}. Please try again.`, 502);
  }
}

export async function POST(request) {
  const { admin, response } = await requireAdmin('users', request);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  const result = await run(() => createAdminUser(body), 'create the user');
  // Who may open the admin is the one change worth recording above all others.
  if (result.ok) {
    await logActivity({
      admin, section: 'users', action: 'created', target: String(body.name || body.mobile || '').trim(),
      detail: body.role ? `role: ${body.role}` : '',
    });
  }
  return result;
}

/** A full edit, or just `{ id, active }` to switch an account on or off. */
export async function PATCH(request) {
  const { admin, response } = await requireAdmin('users', request);
  if (response) return response;
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown user.');

  const onlyActive = Object.keys(body).every((k) => k === 'id' || k === 'active');
  const result = onlyActive
    ? await run(() => setAdminActive(id, body.active !== false, admin.id), 'update the user')
    : await run(() => updateAdminUser(id, body, admin.id), 'save the user');

  if (result.ok) {
    await logActivity({
      admin,
      section: 'users',
      action: 'edited',
      targetId: id,
      target: String(body.name || `User ${id}`).trim(),
      detail: onlyActive
        ? (body.active !== false ? 'switched on' : 'switched off')
        : [body.role ? `role: ${body.role}` : '', body.password ? 'password changed' : '', 'access or details']
          .filter(Boolean).join(', '),
    });
  }
  return result;
}

export async function DELETE(request) {
  const { admin, response } = await requireAdmin('users', request);
  if (response) return response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown user.');
  const result = await run(() => deleteAdminUser(id, admin.id), 'delete the user');
  if (result.ok) {
    await logActivity({ admin, section: 'users', action: 'deleted', targetId: id, target: `User ${id}` });
  }
  return result;
}

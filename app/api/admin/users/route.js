import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  createAdminUser, updateAdminUser, setAdminActive, deleteAdminUser,
} from '@/lib/sql/admin-users';

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
  const { response } = await requireAdmin('users', request);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  return run(() => createAdminUser(body), 'create the user');
}

/** A full edit, or just `{ id, active }` to switch an account on or off. */
export async function PATCH(request) {
  const { admin, response } = await requireAdmin('users', request);
  if (response) return response;
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown user.');

  if (Object.keys(body).every((k) => k === 'id' || k === 'active')) {
    return run(() => setAdminActive(id, body.active !== false, admin.id), 'update the user');
  }
  return run(() => updateAdminUser(id, body, admin.id), 'save the user');
}

export async function DELETE(request) {
  const { admin, response } = await requireAdmin('users', request);
  if (response) return response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown user.');
  return run(() => deleteAdminUser(id, admin.id), 'delete the user');
}

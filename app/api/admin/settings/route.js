import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateSettings } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  try {
    // updateSettings only writes keys on its own allow-list, so an unexpected
    // field in the payload cannot reach the settings table.
    await updateSettings(body);
  } catch (err) {
    console.error('[admin] could not save settings:', err.message);
    return fail('Could not save the settings.', 502);
  }

  return Response.json({ ok: true });
}

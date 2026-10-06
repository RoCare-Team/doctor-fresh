import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateSettings, getSettingsForAdmin } from '@/lib/sql/admin-catalog';
import { logActivity, changedFields } from '@/lib/sql/activity';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { admin, response } = await requireAdmin('settings', 'edit');
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const before = await getSettingsForAdmin().catch(() => ({}));

  try {
    // updateSettings only writes keys on its own allow-list, so an unexpected
    // field in the payload cannot reach the settings table.
    await updateSettings(body);
  } catch (err) {
    console.error('[admin] could not save settings:', err.message);
    return fail('Could not save the settings.', 502);
  }

  await logActivity({
    admin,
    section: 'settings',
    action: 'edited',
    target: 'Site settings',
    detail: changedFields(before, body, Object.keys(body)) || 'saved with no change',
  });

  return Response.json({ ok: true });
}

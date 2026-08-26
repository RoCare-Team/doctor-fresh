import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateCategory } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown category.');
  if (body.name !== undefined && !String(body.name).trim()) return fail('Enter a category name.');

  try {
    await updateCategory(id, body);
  } catch (err) {
    console.error('[admin] could not save the category:', err.message);
    return fail('Could not save the category.', 502);
  }

  return Response.json({ ok: true });
}

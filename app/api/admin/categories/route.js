import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateCategory, getCategory } from '@/lib/sql/admin-catalog';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown category.');
  if (body.name !== undefined && !String(body.name).trim()) return fail('Enter a category name.');
  if (body.metaTitle !== undefined && String(body.metaTitle).length > 255) return fail('The meta title is longer than 255 characters.');
  if (body.metaDescription !== undefined && String(body.metaDescription).length > 255) {
    return fail('The meta description is longer than 255 characters.');
  }

  try {
    await updateCategory(id, body);
  } catch (err) {
    console.error('[admin] could not save the category:', err.message);
    return fail('Could not save the category.', 502);
  }

  // The storefront keeps the catalogue in memory and caches the page; both
  // are refreshed so the change is visible on the next visit, not in minutes.
  clearCache();
  const saved = await getCategory(id).catch(() => null);
  try {
    revalidatePath('/all-category');
    if (saved?.slug) revalidatePath(`/category/${saved.slug}`, 'layout');
  } catch { /* revalidation is best-effort; the page refreshes on its own schedule */ }

  return Response.json({ ok: true, category: saved });
}

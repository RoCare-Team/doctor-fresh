import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  updateSubcategory, getSubcategoryPage, createSubcategory, deleteSubcategory,
} from '@/lib/sql/admin-catalog';
import { saveRedirect } from '@/lib/sql/redirects';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown subcategory.');
  if (body.name !== undefined && !String(body.name).trim()) return fail('Enter a subcategory name.');
  if (body.metaTitle !== undefined && String(body.metaTitle).length > 255) return fail('The meta title is longer than 255 characters.');
  if (body.metaDescription !== undefined && String(body.metaDescription).length > 255) {
    return fail('The meta description is longer than 255 characters.');
  }

  try {
    await updateSubcategory(id, body);
  } catch (err) {
    console.error('[admin] could not save the subcategory:', err.message);
    return fail('Could not save the subcategory.', 502);
  }

  // Same refresh as a category: the in-memory catalogue and the cached pages
  // under the parent category, which include this subcategory's page.
  clearCache();
  const saved = await getSubcategoryPage(id).catch(() => null);
  try {
    if (saved?.categorySlug) revalidatePath(`/category/${saved.categorySlug}`, 'layout');
  } catch { /* best-effort; the page refreshes on its own schedule */ }

  return Response.json({ ok: true, subcategory: saved });
}

/** A new subcategory under an existing category. */
export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let created;
  try {
    created = await createSubcategory(body);
  } catch (err) {
    console.error('[admin] could not create the subcategory:', err.message);
    return fail('Could not create the subcategory.', 502);
  }
  if (created.error) return fail(created.error);

  clearCache();
  try {
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }

  return Response.json({ ok: true, ...created });
}

/**
 * Deletes an empty subcategory. With `redirectTo`, its old address gets a 301 to
 * that page, so links and Google results keep landing somewhere useful.
 */
export async function DELETE(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown subcategory.');

  let done;
  try {
    done = await deleteSubcategory(id);
  } catch (err) {
    console.error('[admin] could not delete the subcategory:', err.message);
    return fail('Could not delete the subcategory.', 502);
  }
  if (done.error) return fail(done.error);

  let redirect = null;
  if (body.redirectTo) {
    redirect = await saveRedirect({ source: done.path, destination: body.redirectTo, type: 301 })
      .catch(() => ({ ok: false, error: 'The redirect could not be saved.' }));
  }

  clearCache();
  try {
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }

  return Response.json({ ok: true, ...done, redirect });
}

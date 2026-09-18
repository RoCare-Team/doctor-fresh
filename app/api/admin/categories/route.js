import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  updateCategory, getCategory, createCategory, deleteCategory,
} from '@/lib/sql/admin-catalog';
import { saveRedirect } from '@/lib/sql/redirects';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin('categories', request);
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

/** A new category. It opens in the editor afterwards for the rest of its page. */
export async function POST(request) {
  const { response } = await requireAdmin('categories', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let created;
  try {
    created = await createCategory(body);
  } catch (err) {
    console.error('[admin] could not create the category:', err.message);
    return fail('Could not create the category.', 502);
  }
  if (created.error) return fail(created.error);

  // A new category joins the menus and the category list on every page.
  clearCache();
  try {
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }

  return Response.json({ ok: true, id: created.id, slug: created.slug });
}

/**
 * Deletes an empty category. With `redirectTo`, its old address gets a 301 to
 * that page, so links and Google results keep landing somewhere useful.
 */
export async function DELETE(request) {
  const { response } = await requireAdmin('categories', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown category.');

  let done;
  try {
    done = await deleteCategory(id);
  } catch (err) {
    console.error('[admin] could not delete the category:', err.message);
    return fail('Could not delete the category.', 502);
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

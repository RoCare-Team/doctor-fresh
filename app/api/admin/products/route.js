import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateProduct, createProduct, deleteProduct } from '@/lib/sql/admin-catalog';
import { saveRedirect } from '@/lib/sql/redirects';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin('products', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown product.');

  if (body.title !== undefined && !String(body.title).trim()) return fail('Enter a product name.');
  if (body.salePrice !== undefined && Number(body.salePrice) < 0) return fail('Price cannot be negative.');
  if (body.stock !== undefined && Number(body.stock) < 0) return fail('Stock cannot be negative.');

  try {
    await updateProduct(id, body);
  } catch (err) {
    console.error('[admin] could not save the product:', err.message);
    return fail('Could not save the product. Please try again.', 502);
  }

  return Response.json({ ok: true });
}

export async function POST(request) {
  const { admin, response } = await requireAdmin('products', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  if (!String(body.title ?? '').trim()) return fail('Enter a product name.');
  if (!Number(body.categoryId)) return fail('Choose a category.');
  if (Number(body.salePrice) < 0) return fail('Price cannot be negative.');
  if (Number(body.stock) < 0) return fail('Stock cannot be negative.');

  let created;
  try {
    created = await createProduct(body, admin.id);
  } catch (err) {
    console.error('[admin] could not create the product:', err.message);
    return fail('Could not create the product. Please try again.', 502);
  }

  if (!created.ok) return fail(created.reason);
  return Response.json({ ok: true, id: created.id, slug: created.slug });
}

/**
 * Deletes a product. With `redirectTo`, its old address gets a 301 there, so
 * shared links and Google results land on a real page instead of a 404.
 */
export async function DELETE(request) {
  const { response } = await requireAdmin('products', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown product.');

  let done;
  try {
    done = await deleteProduct(id);
  } catch (err) {
    console.error('[admin] could not delete the product:', err.message);
    return fail('Could not delete the product.', 502);
  }
  if (done.error) return fail(done.error);

  let redirect = null;
  if (body.redirectTo) {
    redirect = await saveRedirect({ source: done.path, destination: body.redirectTo, type: 301 })
      .catch(() => ({ ok: false, error: 'The redirect could not be saved.' }));
  }

  // The product leaves every listing, search result and menu count.
  clearCache();
  try {
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }

  return Response.json({ ok: true, ...done, redirect });
}

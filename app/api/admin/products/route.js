import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  updateProduct, createProduct, deleteProduct, getProduct,
} from '@/lib/sql/admin-catalog';
import { logActivity, changedFields } from '@/lib/sql/activity';
import { saveRedirect } from '@/lib/sql/redirects';
import { clearCache } from '@/lib/sql/cache';
import { PRODUCT_TAG } from '@/lib/sql/repository';

export const dynamic = 'force-dynamic';

/**
 * Every server reads the catalogue under this tag, so dropping it is what puts
 * a saved change on the live site straight away rather than whenever the
 * stored page happens to expire.
 */
function refreshProducts() {
  clearCache();
  try {
    revalidateTag(PRODUCT_TAG);
    revalidatePath('/', 'layout');
  } catch { /* best-effort; the pages refresh on their own schedule */ }
}

// What a reader of the log cares about; the long HTML fields are recorded as
// "changed" by name rather than printed into it.
const PRODUCT_FIELDS = [
  { key: 'title', label: 'name' },
  { key: 'salePrice', label: 'price' },
  { key: 'discount', label: 'discount' },
  { key: 'stock', label: 'stock' },
  { key: 'live', label: 'live' },
  { key: 'featured', label: 'featured' },
  { key: 'deal', label: "today's deal" },
  { key: 'categoryId', label: 'category' },
  { key: 'metaTitle', label: 'meta title' },
  { key: 'metaDescription', label: 'meta description' },
  { key: 'keywords', label: 'keywords' },
  { key: 'unit', label: 'unit' },
  { key: 'videoUrl', label: 'video' },
];

export async function PATCH(request) {
  const { admin, response } = await requireAdmin('products', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const id = Number(body.id);
  if (!id) return fail('Unknown product.');

  if (body.title !== undefined && !String(body.title).trim()) return fail('Enter a product name.');
  if (body.salePrice !== undefined && Number(body.salePrice) < 0) return fail('Price cannot be negative.');
  if (body.stock !== undefined && Number(body.stock) < 0) return fail('Stock cannot be negative.');

  // Read before the write so the log can say what moved, not merely that
  // something was saved.
  const before = await getProduct(id).catch(() => null);

  try {
    await updateProduct(id, body);
  } catch (err) {
    console.error('[admin] could not save the product:', err.message);
    return fail('Could not save the product. Please try again.', 502);
  }

  refreshProducts();
  await logActivity({
    admin,
    section: 'products',
    action: 'edited',
    targetId: id,
    target: before?.name || body.title || `Product ${id}`,
    detail: changedFields(before || {}, body, PRODUCT_FIELDS)
      || 'description, images or other details',
  });
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

  refreshProducts();
  await logActivity({
    admin,
    section: 'products',
    action: 'created',
    targetId: created.id,
    target: String(body.title || '').trim(),
  });
  return Response.json({ ok: true, id: created.id, slug: created.slug });
}

/**
 * Deletes a product. With `redirectTo`, its old address gets a 301 there, so
 * shared links and Google results land on a real page instead of a 404.
 */
export async function DELETE(request) {
  const { admin, response } = await requireAdmin('products', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown product.');

  const before = await getProduct(id).catch(() => null);

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
  refreshProducts();
  await logActivity({
    admin,
    section: 'products',
    action: 'deleted',
    targetId: id,
    target: before?.name || `Product ${id}`,
    detail: body.redirectTo ? `redirected to ${body.redirectTo}` : '',
  });

  return Response.json({ ok: true, ...done, redirect });
}

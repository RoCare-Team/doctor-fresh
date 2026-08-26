import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { updateProduct, createProduct } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { response } = await requireAdmin();
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
  const { admin, response } = await requireAdmin();
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

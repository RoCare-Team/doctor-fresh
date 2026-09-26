// Product reviews: write, edit, hide and delete.
//
// A review changes the star rating shown on the product page and in every
// listing that repeats it, so each write drops the catalogue's shared cache —
// the same tag a product save drops — and the pages rebuild at once.

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { createReview, updateReview, deleteReview } from '@/lib/sql/admin-reviews';
import { clearCache } from '@/lib/sql/cache';
import { PRODUCT_TAG } from '@/lib/sql/repository';

export const dynamic = 'force-dynamic';

function refresh() {
  clearCache();
  try {
    revalidateTag(PRODUCT_TAG);
    revalidatePath('/', 'layout');
  } catch { /* best-effort; the pages refresh on their own schedule */ }
}

export async function POST(request) {
  const { response } = await requireAdmin('reviews', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let made;
  try {
    made = await createReview(body);
  } catch (err) {
    console.error('[admin] could not save the review:', err.message);
    return fail('Could not save the review. Please try again.', 502);
  }
  if (made.error) return fail(made.error);

  refresh();
  return Response.json({ ok: true, id: made.id });
}

export async function PATCH(request) {
  const { response } = await requireAdmin('reviews', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown review.');

  let saved;
  try {
    saved = await updateReview(id, body);
  } catch (err) {
    console.error('[admin] could not save the review:', err.message);
    return fail('Could not save the review. Please try again.', 502);
  }
  if (saved.error) return fail(saved.error);

  refresh();
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const { response } = await requireAdmin('reviews', 'delete');
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown review.');

  let done;
  try {
    done = await deleteReview(id);
  } catch (err) {
    console.error('[admin] could not delete the review:', err.message);
    return fail('Could not delete the review.', 502);
  }
  if (done.error) return fail(done.error);

  refresh();
  return Response.json({ ok: true });
}

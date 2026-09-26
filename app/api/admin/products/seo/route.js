// Draft a product's page copy with AI, and apply what the admin keeps.
//
// POST returns a draft and saves nothing. PUT writes back only the parts the
// admin ticked, through the same paths the hand-written screens use, so
// nothing reaches a product page unread.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { writeProductSeo, keyConfigured } from '@/lib/ai/seo';
import { getProduct, updateProduct } from '@/lib/sql/admin-catalog';
import { createReview } from '@/lib/sql/admin-reviews';
import { clearCache } from '@/lib/sql/cache';
import { revalidatePath, revalidateTag } from 'next/cache';
import { PRODUCT_TAG } from '@/lib/sql/repository';

export const dynamic = 'force-dynamic';
// A long answer from the model; the platform's own ceiling applies above this.
export const maxDuration = 300;

function refresh() {
  clearCache();
  try {
    revalidateTag(PRODUCT_TAG);
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }
}

/** Plain text of the description, for the model to rewrite rather than repeat. */
const textOf = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function POST(request) {
  const { response } = await requireAdmin('products', 'edit');
  if (response) return response;

  if (!keyConfigured()) {
    return fail('The AI key is not set up yet. Add OPENAI_API_KEY to the site settings and try again.', 503);
  }

  const body = await readJson(request);
  const id = Number(body?.productId);
  if (!id) return fail('Unknown product.');

  const product = await getProduct(id);
  if (!product) return fail('That product no longer exists.');

  const { draft, error } = await writeProductSeo({
    product: {
      name: product.name,
      category: product.categoryName,
      salePrice: product.salePrice,
      unit: product.unit,
      specs: product.specs,
      descriptionText: textOf(product.descriptionHtml),
    },
    context: String(body.context || '').slice(0, 4000),
  });

  if (error) return fail(error, 502);
  return Response.json({ ok: true, draft });
}

export async function PUT(request) {
  const { response } = await requireAdmin('products', 'edit');
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.productId);
  const apply = body?.apply || {};
  if (!id) return fail('Unknown product.');

  const fields = {};
  if (apply.descriptionHtml) fields.descriptionHtml = String(apply.descriptionHtml);
  if (Array.isArray(apply.specs)) fields.specs = apply.specs;
  if (Array.isArray(apply.faqs)) fields.faqs = apply.faqs;
  if (apply.metaTitle) fields.metaTitle = String(apply.metaTitle);
  if (apply.metaDescription) fields.metaDescription = String(apply.metaDescription);
  if (Array.isArray(apply.keywords) && apply.keywords.length) fields.keywords = apply.keywords.join(', ');

  try {
    if (Object.keys(fields).length) await updateProduct(id, fields);
  } catch (err) {
    console.error('[admin] could not apply the AI draft:', err.message);
    return fail('Could not save the product. Please try again.', 502);
  }

  // Reviews are rows of their own, so a failure there is reported per review
  // rather than losing the rest of the draft.
  let reviewsWritten = 0;
  const reviewErrors = [];
  for (const review of (Array.isArray(apply.reviews) ? apply.reviews : []).slice(0, 12)) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const made = await createReview({ ...review, productId: id });
      if (made.error) reviewErrors.push(made.error);
      else reviewsWritten += 1;
    } catch (err) {
      reviewErrors.push(err.message);
    }
  }

  refresh();
  return Response.json({
    ok: true,
    saved: Object.keys(fields),
    reviewsWritten,
    reviewErrors: reviewErrors.slice(0, 3),
  });
}

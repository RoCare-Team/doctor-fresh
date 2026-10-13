// GET /api/mobile/product/<id> — one product, with everything its page shows:
// gallery, prices, stock, badges, specifications, attributes, description,
// installation and shipping notes, video, reviews, FAQs, and related
// products.
//
//   { ok, product: { …, images: [absolute], category, subcategory, … },
//     related: [card] }
//
// Read-only.

import { getProductById, getRelatedProducts } from '@/lib/catalog';
import {
  fail, img, mobileCard, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!Number(id)) return fail('Unknown product.');

  try {
    await readyMedia();
    const product = await getProductById(id);
    if (!product) return fail('Product not found.', 404);

    const related = await getRelatedProducts(product, 10);
    const {
      subcategoryHrefs, sortId, addedAt, views, ...rest
    } = product;

    return ok({
      product: {
        ...rest,
        images: (product.images || []).map(img),
        webUrl: img(product.url),
      },
      related: related.map(mobileCard),
    });
  } catch (err) {
    return unavailable(err, 'product');
  }
}

// GET /api/mobile/category?path=<category>[/<subcategory>]
//
// One listing page, as /category/... shows it:
//
//   { ok, category: { name, slug, href, heading, intro, faqs,
//       subcategories: [{ name, slug, href }] },
//     subcategory: { name, slug, href, heading, intro, faqs } | null,
//     products: [card] }
//
// `path=spare-parts` is the spare parts page (water-purifier-spare-parts). A
// third segment (the brand level) lists the same products as its
// subcategory, as the website does. Read-only. Sorting and filtering are left
// to the app, as the website does them in the browser.

import {
  getCategory, getProductsByCategory, getProductsBySubcategory, getSubcategory,
} from '@/lib/catalog';
import {
  fail, mobileCard, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

const section = (c) => (c ? {
  id: c.id,
  name: c.name,
  slug: c.slug,
  href: c.href,
  heading: c.heading || c.name,
  intro: c.intro || '',
  metaDescription: c.metaDescription || '',
  faqs: c.faqs || [],
} : null);

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('path') || '';
  const parts = raw.replace(/^\/?(category\/)?/, '').split('/').filter(Boolean);
  if (parts[0] === 'spare-parts') parts[0] = 'water-purifier-spare-parts';

  const [categorySlug, subSlug] = parts;
  if (!categorySlug) return fail('path is required.');

  try {
    await readyMedia();
    const category = await getCategory(categorySlug);
    if (!category) return fail('Category not found.', 404);

    let subcategory = null;
    let products;
    if (subSlug) {
      const found = await getSubcategory(categorySlug, subSlug);
      if (!found) return fail('Category not found.', 404);
      subcategory = found.subcategory;
      products = await getProductsBySubcategory(categorySlug, subSlug);
    } else {
      products = await getProductsByCategory(categorySlug);
    }

    return ok({
      category: {
        ...section(category),
        subcategories: category.subcategories.map((s) => ({
          id: s.id, name: s.name, slug: s.slug, href: s.href,
        })),
      },
      subcategory: section(subcategory),
      products: products.map(mobileCard),
    });
  } catch (err) {
    return unavailable(err, 'category');
  }
}

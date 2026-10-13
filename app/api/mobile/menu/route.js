// GET /api/mobile/menu — the app's navigation: the category tree (as the
// website's menu drawer lists it), the blog categories, the footer's legal
// pages and the brand's contact details.
//
//   { ok, brand, categories: [{ name, slug, href, image, productCount,
//     subcategories: [{ name, slug, href }] }], blogCategories, legal }
//
// Read-only.

import {
  getAllCategories, getBlogCategories, getBrand, getCategoryImage, getFooterLinks,
  getProductsByCategory,
} from '@/lib/catalog';
import {
  img, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await readyMedia();
    const [categories, blogCategories, brand, footer] = await Promise.all([
      getAllCategories(),
      getBlogCategories(),
      getBrand(),
      getFooterLinks(),
    ]);

    const tree = await Promise.all(categories.map(async (c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      href: c.href,
      image: img(await getCategoryImage(c.href)),
      productCount: (await getProductsByCategory(c.slug)).length,
      subcategories: c.subcategories.map((s) => ({
        id: s.id, name: s.name, slug: s.slug, href: s.href,
      })),
    })));

    return ok({
      brand: {
        name: brand.name,
        logo: img(brand.logo),
        phone: brand.phone,
        phoneRaw: brand.phoneRaw,
        email: brand.email,
        website: brand.website,
        whatsapp: brand.whatsapp,
        about: brand.about,
        offices: brand.offices,
        social: brand.social,
      },
      categories: tree,
      blogCategories: blogCategories.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
      legal: footer.legal.map((l) => ({ label: l.label, slug: l.href.replace('/legal/', '') })),
    });
  } catch (err) {
    return unavailable(err, 'menu');
  }
}

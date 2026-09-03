// Catalog access layer.
//
// Every page reads the site's content through these functions, and every one of
// them answers from the existing SQL database (`dotindoc_website`) — the same
// tables the PHP site serves from. There is no second copy of the data:
//
//   products / prices / specs / reviews  →  product, attribute, attribute_filter,
//                                           product_reviews
//   categories and subcategories         →  category, sub_category
//   blog                                 →  blog, blog_category
//   the 22,195 flat SEO URLs             →  landing_pages
//   brand, footer, policies, slides      →  general_settings, social_links, slides
//
// If the database cannot answer, these functions throw rather than serving
// something made up. Next.js keeps the last successfully rendered page, so a
// brief outage shows the previous real content — never invented content.

import {
  getProductsFromDb, getCategoriesFromDb, getBlogsFromDb,
} from '@/lib/sql/repository';
import {
  getLandingPageFromDb, getLandingSlugsForBuild, getNearbyLandingPages,
} from '@/lib/sql/landing';
import {
  getBrandFromDb, getHeroSlidesFromDb, getLegalPagesFromDb, getPopularLinksFromDb,
} from '@/lib/sql/site';

// How many city pages per service family are prerendered; the rest render on
// demand. 22,195 pages is far too many to build up front.
const PRERENDER_PER_FAMILY = Number(process.env.PRERENDER_PER_FAMILY) || 40;

/**
 * The loaders return null when the database is unreachable. Pages must not
 * quietly render an empty catalogue in that case, so it is raised instead.
 */
function required(value, what) {
  if (value === null || value === undefined) {
    throw new Error(`Could not load ${what} from the database`);
  }
  return value;
}

async function allProductRows() {
  return required(await getProductsFromDb(), 'products');
}

async function allCategoryRows() {
  return required(await getCategoriesFromDb(), 'categories');
}

async function allBlogRows() {
  return required(await getBlogsFromDb(), 'blog posts');
}

/* ------------------------------------------------------------------ products */

// A product can be reachable under more than one slug; listings show it once.
function dedupe(list) {
  return list.filter((p, i) => list.findIndex((o) => o.id === p.id) === i);
}

export async function getAllProducts() {
  return dedupe(await allProductRows());
}

/**
 * Product URLs to prerender. The page itself looks a product up by id, so an
 * older slug for the same id still resolves — it simply renders on demand.
 */
export async function getProductRoutes() {
  const rows = await allProductRows();
  return rows.map((p) => ({ slug: p.slug, id: String(p.id) }));
}

/**
 * A product trimmed to what a card shows.
 *
 * A catalogue row carries its description, spec table, FAQs, attributes and
 * reviews — everything the product page needs. A card renders none of it, but
 * a server component still serialises whatever it is handed into the page, so
 * a grid of 36 cards was shipping a few hundred kilobytes nothing on screen
 * reads. These are the fields the card, its buttons and the cart line it can
 * create actually use.
 */
export function cardProduct(product) {
  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    url: product.url,
    // Only the first is ever shown; the gallery lives on the product page.
    images: product.images?.length ? [product.images[0]] : [],
    price: product.price,
    mrp: product.mrp,
    unit: product.unit,
    discountPercent: product.discountPercent,
    inStock: product.inStock,
    maxQty: product.maxQty,
    rating: product.rating,
    reviewCount: product.reviewCount,
    metaDescription: product.metaDescription,
  };
}

export async function getProductById(id) {
  const numeric = Number(id);
  const rows = await allProductRows();
  return rows.find((p) => p.id === numeric) || null;
}

export async function getProductsByIds(ids = []) {
  const rows = await allProductRows();
  return ids.map((id) => rows.find((p) => p.id === Number(id))).filter(Boolean);
}

export async function getProductsByCategory(categorySlug) {
  const href = `/category/${categorySlug}`;
  const rows = await allProductRows();
  return dedupe(rows.filter((p) => p.category && p.category.href === href));
}

export async function getProductsBySubcategory(categorySlug, subcategorySlug) {
  const href = `/category/${categorySlug}/${subcategorySlug}`;
  const rows = await allProductRows();
  // A product can belong to several subcategories ("160,121,145,…"); every
  // listing it is a member of must find it.
  return dedupe(rows.filter((p) => p.subcategoryHrefs?.includes(href)));
}

export async function getRelatedProducts(product, limit = 8) {
  if (!product) return [];
  const rows = await allProductRows();

  const sameSub = product.subcategory
    ? rows.filter((p) => p.id !== product.id && p.subcategory?.href === product.subcategory.href)
    : [];
  const sameCat = product.category
    ? rows.filter((p) => p.id !== product.id && p.category?.href === product.category.href)
    : [];

  const seen = new Set();
  return [...sameSub, ...sameCat]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .slice(0, limit);
}

export async function searchProducts(query, limit = 40) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const rows = await allProductRows();

  return dedupe(rows)
    .map((p) => {
      const haystack = [p.name, p.category?.name, p.subcategory?.name, p.metaDescription]
        .filter(Boolean).join(' ').toLowerCase();
      const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p);
}

/* ---------------------------------------------------------------- categories */

/**
 * The brand level the live site exposes under every subcategory (currently only
 * Doctor Fresh). The URLs are linked from the mega menu, so they are prerendered
 * and listed in the sitemap; both read the list from here.
 */
export const SUBCATEGORY_BRANDS = { 'doctor-fresh': 'Doctor Fresh' };

export async function getAllCategories() {
  return allCategoryRows();
}

export async function getCategory(slug) {
  const rows = await allCategoryRows();
  return rows.find((c) => c.slug === slug) || null;
}

/**
 * A real product photo to represent a category tile. The stored category icons
 * are only 62×53px, far too small for a large card, so the first catalogue
 * image for that category is used instead — same imagery, proper resolution.
 */
export async function getCategoryImage(href) {
  const slug = href === '/spare-parts'
    ? 'water-purifier-spare-parts'
    : (href.match(/^\/category\/([^/]+)/) || [])[1];
  if (!slug) return null;

  const owned = (await getProductsByCategory(slug)).find((p) => p.images?.[0]);
  return owned ? owned.images[0] : null;
}

export async function getSubcategory(categorySlug, subcategorySlug) {
  const category = await getCategory(categorySlug);
  if (!category) return null;
  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug);
  return subcategory ? { category, subcategory } : null;
}

/* --------------------------------------------------------------------- blogs */

export async function getAllBlogPosts() {
  const { posts } = await allBlogRows();
  return [...posts].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
}

export async function getBlogCategories() {
  const { categories } = await allBlogRows();
  return categories;
}

export async function getBlogCategory(slug) {
  const { categories } = await allBlogRows();
  return categories.find((c) => c.slug === slug) || null;
}

export async function getBlogPostsByCategory(slug) {
  const posts = await getAllBlogPosts();
  return posts.filter((p) => p.categories.includes(slug));
}

export async function getBlogPost(id) {
  const numeric = Number(id);
  const { posts } = await allBlogRows();
  return posts.find((p) => p.id === numeric) || null;
}

export async function getRelatedBlogPosts(post, limit = 3) {
  if (!post) return [];
  const all = (await getAllBlogPosts()).filter((p) => p.id !== post.id);
  const sameCat = all.filter((p) => p.categories.some((c) => post.categories.includes(c)));
  const seen = new Set();
  return [...sameCat, ...all]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .slice(0, limit);
}

/* ------------------------------------------------------------ site content */

/** Brand details from `general_settings` and `social_links`. */
export async function getBrand() {
  return required(await getBrandFromDb(), 'brand settings');
}

/** Home page hero images, from the `slides` table. */
export async function getHeroSlides() {
  return (await getHeroSlidesFromDb()) || [];
}

/** Footer link groups, built from the live category tree and landing pages. */
export async function getFooterLinks() {
  const [categories, popular, legalPages] = await Promise.all([
    getAllCategories(),
    getPopularLinksFromDb(),
    getLegalPagesFromDb(),
  ]);

  return {
    categories: categories.slice(0, 8).map((c) => ({ href: c.href, label: c.name })),
    legal: Object.values(legalPages || {})
      .filter((p) => !p.canonical)
      .map((p) => ({ href: `/legal/${p.slug}`, label: p.title })),
    popularServices: popular?.services || [],
    popularRoServiceCities: popular?.roServiceCities || [],
    popularWaterPurifierCities: popular?.waterPurifierCities || [],
  };
}

/** One policy document, stored as a `general_settings` row. */
export async function getLegalPage(slug) {
  const pages = await getLegalPagesFromDb();
  return pages?.[slug] || null;
}

export async function getLegalSlugs() {
  return Object.keys((await getLegalPagesFromDb()) || {});
}

/* -------------------------------------------------------- home page rails */

/**
 * The home page product groups, derived from the catalogue itself: `featured`
 * and `deal` are columns the admin panel sets — the same ones the PHP site
 * filters on — and each category rail is that category's products.
 */
export async function getHomeSections() {
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);

  const featured = products.filter((p) => p.badges?.includes('Featured'));
  const deals = products.filter((p) => p.badges?.includes('Today’s Deal'));

  const railFor = (slug, title) => {
    const items = products.filter((p) => p.category?.href === `/category/${slug}`);
    return items.length
      ? { title, href: `/category/${slug}`, productIds: items.slice(0, 8).map((p) => p.id) }
      : null;
  };

  const rails = [
    featured.length ? { title: 'Featured Products', productIds: featured.slice(0, 8).map((p) => p.id) } : null,
    railFor('water-purifier', 'Water Purifier'),
    railFor('ro-plant', 'RO Plant'),
    railFor('water-softener', 'Water Softener'),
    railFor('water-ionizer', 'Water Ionizer'),
  ].filter(Boolean);

  return {
    rails,
    todaysDeal: deals.slice(0, 8).map((p) => p.id),

    // The two columns the current home page shows beside "Recently Viewed",
    // ordered by the same columns the PHP site orders them by.
    latest: [...products].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3).map((p) => p.id),
    mostViewed: [...products].sort((a, b) => b.views - a.views).slice(0, 3).map((p) => p.id),
    categoryTiles: categories.map((c) => ({ href: c.href, label: c.name, icon: null })),
  };
}

/* ---------------------------------------------------------------- SEO pages */

/**
 * One flat SEO URL (/water-purifier-service, /ro-service-mumbai, …), read from
 * `landing_pages`. Returns null when the slug is not a published page — the
 * route then renders the not-found page, which is what the live site shows for
 * an unknown slug.
 */
export async function getLandingPage(slug) {
  return getLandingPageFromDb(slug);
}

/** Slugs to prerender; the rest render on demand. */
export async function getLandingRoutes() {
  return required(await getLandingSlugsForBuild(PRERENDER_PER_FAMILY), 'landing pages');
}

export async function getNearbyPages(page, limit = 24) {
  return getNearbyLandingPages(page, limit);
}

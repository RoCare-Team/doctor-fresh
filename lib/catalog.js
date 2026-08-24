// Catalog access layer.
//
// Every page reads the catalogue through these functions, never by importing
// the data files directly.
//
// Products, categories and blogs are served from the existing SQL database when
// DB credentials are configured (see lib/db.js and lib/sql/). When they are not
// — or when the database is unreachable — the same functions fall back to the
// bundled data extracted from the live site, so the site never goes down over a
// database problem and behaves identically either way.
//
// Service/location pages are content templates rather than catalogue records,
// so they stay on the static data and stay synchronous.

import { products as staticProducts } from '@/data/products';
import { categories as staticCategories } from '@/data/categories';
import { blogPosts as staticBlogPosts, blogCategories as staticBlogCategories } from '@/data/blogs';
import { serviceTemplates, servicePages } from '@/data/services';
import { getLocationSlugs, hasLocation, locationFamilies } from '@/data/locations';
import { getProductsFromDb, getCategoriesFromDb, getBlogsFromDb } from '@/lib/sql/repository';

/* --------------------------------------------------------------- sources */

/** Raw product list — SQL when available, extracted data otherwise. */
async function allProductRows() {
  return (await getProductsFromDb()) || staticProducts;
}

async function allCategoryRows() {
  return (await getCategoriesFromDb()) || staticCategories;
}

async function allBlogRows() {
  const db = await getBlogsFromDb();
  if (db && db.posts.length) return db;
  return { posts: staticBlogPosts, categories: staticBlogCategories };
}

/* ------------------------------------------------------------------ products */

// Two products are reachable under two different live slugs each
// (e.g. /product/doctor-fresh-life-go/1683 and
// /product/antioxidant-mineralising-alkaline-bottle/1683). Both URLs must keep
// working, so the raw list drives route generation while listings use the
// de-duplicated view.
function dedupe(list) {
  return list.filter((p, i) => list.findIndex((o) => o.id === p.id) === i);
}

export async function getAllProducts() {
  return dedupe(await allProductRows());
}

/** Every live product URL, including duplicate slugs for the same product id. */
export async function getProductRoutes() {
  const rows = await allProductRows();
  const routes = rows.map((p) => ({ slug: p.slug, id: String(p.id) }));

  // The database keeps one canonical slug per product, but a few products are
  // also reachable under an older slug that is still live
  // (/product/doctor-fresh-life-go/1683). Those URLs were captured from the
  // running site and are merged in so none of them starts 404ing.
  const seen = new Set(routes.map((r) => `${r.id}/${r.slug}`));
  for (const p of staticProducts) {
    const key = `${p.id}/${p.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      routes.push({ slug: p.slug, id: String(p.id) });
    }
  }

  return routes;
}

export async function getProductById(id) {
  const numeric = Number(id);
  const rows = await allProductRows();
  return rows.find((p) => p.id === numeric) || null;
}

export async function getProductsByIds(ids = []) {
  const rows = await allProductRows();
  return ids
    .map((id) => rows.find((p) => p.id === Number(id)))
    .filter(Boolean);
}

export async function getProductsByCategory(categorySlug) {
  const href = `/category/${categorySlug}`;
  const rows = await allProductRows();
  return dedupe(rows.filter((p) => p.category && p.category.href === href));
}

export async function getProductsBySubcategory(categorySlug, subcategorySlug) {
  const href = `/category/${categorySlug}/${subcategorySlug}`;
  const rows = await allProductRows();
  // SQL rows carry every subcategory the product belongs to; the extracted data
  // only kept the primary one.
  return dedupe(rows.filter((p) => (
    p.subcategoryHrefs ? p.subcategoryHrefs.includes(href) : p.subcategory?.href === href
  )));
}

export async function getRelatedProducts(product, limit = 8) {
  if (!product) return [];
  const rows = await allProductRows();

  const sameSub = product.subcategory
    ? rows.filter((p) => p.id !== product.id && p.subcategory && p.subcategory.href === product.subcategory.href)
    : [];
  const sameCat = product.category
    ? rows.filter((p) => p.id !== product.id && p.category && p.category.href === product.category.href)
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
  if (owned) return owned.images[0];

  // Fall back only to products that really belong to this category. Some pages
  // (STP, ETP) list the site-wide recommendation rail, which would otherwise
  // put a water purifier on the tile; those keep their own icon instead.
  const category = await getCategory(slug);
  const listed = (await getProductsByIds(category?.productIds || []))
    .find((p) => p?.images?.[0] && p.category?.href === `/category/${slug}`);
  return listed ? listed.images[0] : null;
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

/* ------------------------------------------------------- services / locations */

export function getServicePage(slug) {
  return servicePages[slug] || null;
}

export function getServicePageSlugs() {
  return Object.keys(servicePages);
}

/**
 * Resolve a flat slug such as `ro-service-kanchipurum` or `water-purifier-mumbai`
 * into { template, locationSlug, locationName }.
 *
 * The live site renders these pages from the slug itself rather than from a
 * fixed list — `/ro-service-<anything>` returns 200 today, including spellings
 * and encoded spaces that are not in the sitemap (`/ro-service-kanchipurum`,
 * `/ro-service-pimpri%20chinchwad`). That behaviour is preserved here so no
 * currently-working URL starts returning 404. `listed` reports whether the slug
 * is one of the 21,400 sitemap entries, which is what drives prerendering.
 *
 * Fixed service pages (water-purifier-service / -installation / -amc) are
 * checked first so they are never mistaken for a location.
 */
export function resolveLocationSlug(slug) {
  if (!slug || servicePages[slug]) return null;

  // Longest prefix first, so `water-atm-machine-manufacturers-x` is not read as
  // a shorter family and `water-cooled-chiller-x` keeps its own template.
  const families = [...locationFamilies].sort((a, b) => b.length - a.length);

  for (const key of families) {
    const prefix = `${key}-`;
    if (!slug.startsWith(prefix)) continue;
    const locationSlug = slug.slice(prefix.length).trim();
    if (!locationSlug) continue;
    return {
      key,
      template: serviceTemplates[key],
      locationSlug,
      locationName: humanizeLocation(locationSlug),
      listed: hasLocation(key, locationSlug),
      href: `/${slug}`,
    };
  }
  return null;
}

export function humanizeLocation(slug) {
  return decodeURIComponent(slug || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function getLocationFamily(key) {
  return { key, template: serviceTemplates[key], slugs: getLocationSlugs(key) };
}

export function getServiceTemplate(key) {
  return serviceTemplates[key] || null;
}

/** Small sample used for internal linking blocks on location pages. */
export function getNearbyLocations(key, currentSlug, limit = 24) {
  const slugs = getLocationSlugs(key);
  const idx = slugs.indexOf(currentSlug);
  if (idx < 0) return slugs.slice(0, limit);
  const start = Math.max(0, idx - Math.floor(limit / 2));
  return slugs.slice(start, start + limit + 1).filter((s) => s !== currentSlug).slice(0, limit);
}

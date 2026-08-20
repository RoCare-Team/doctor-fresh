// Catalog access layer.
//
// Every page reads the catalogue through these functions, never by importing the
// data files directly. When the existing SQL/API is connected, only this file
// changes (each function becomes a query) — no UI component needs to be touched.

import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { blogPosts, blogCategories } from '@/data/blogs';
import { serviceTemplates, servicePages } from '@/data/services';
import { getLocationSlugs, hasLocation, locationFamilies } from '@/data/locations';

/* ------------------------------------------------------------------ products */

// Two products are reachable under two different live slugs each
// (e.g. /product/doctor-fresh-life-go/1683 and
// /product/antioxidant-mineralising-alkaline-bottle/1683). Both URLs must keep
// working, so the raw list drives route generation while listings use the
// de-duplicated view.
const uniqueProducts = products.filter(
  (p, i) => products.findIndex((o) => o.id === p.id) === i,
);

export function getAllProducts() {
  return uniqueProducts;
}

/** Every live product URL, including duplicate slugs for the same product id. */
export function getProductRoutes() {
  return products.map((p) => ({ slug: p.slug, id: String(p.id) }));
}

export function getProductById(id) {
  const numeric = Number(id);
  return products.find((p) => p.id === numeric) || null;
}

export function getProductsByIds(ids = []) {
  return ids.map((id) => getProductById(id)).filter(Boolean);
}

export function getProductsByCategory(categorySlug) {
  const href = `/category/${categorySlug}`;
  return products.filter((p) => p.category && p.category.href === href);
}

export function getProductsBySubcategory(categorySlug, subcategorySlug) {
  const href = `/category/${categorySlug}/${subcategorySlug}`;
  return products.filter((p) => p.subcategory && p.subcategory.href === href);
}

export function getRelatedProducts(product, limit = 8) {
  if (!product) return [];
  const sameSub = product.subcategory
    ? products.filter((p) => p.id !== product.id && p.subcategory && p.subcategory.href === product.subcategory.href)
    : [];
  const sameCat = product.category
    ? products.filter((p) => p.id !== product.id && p.category && p.category.href === product.category.href)
    : [];
  const seen = new Set();
  return [...sameSub, ...sameCat]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .slice(0, limit);
}

export function searchProducts(query, limit = 40) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return products
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

export function getAllCategories() {
  return categories;
}

export function getCategory(slug) {
  return categories.find((c) => c.slug === slug) || null;
}

/**
 * A real product photo to represent a category tile. The stored category icons
 * are only 62×53px, far too small for a large card, so the first catalogue
 * image for that category is used instead — same imagery, proper resolution.
 */
export function getCategoryImage(href) {
  const slug = href === '/spare-parts'
    ? 'water-purifier-spare-parts'
    : (href.match(/^\/category\/([^/]+)/) || [])[1];
  if (!slug) return null;

  const owned = getProductsByCategory(slug).find((p) => p.images?.[0]);
  if (owned) return owned.images[0];

  // Fall back only to products that really belong to this category. Some pages
  // (STP, ETP) list the site-wide recommendation rail, which would otherwise
  // put a water purifier on the tile; those keep their own icon instead.
  const category = getCategory(slug);
  const listed = (category?.productIds || [])
    .map((id) => getProductById(id))
    .find((p) => p?.images?.[0] && p.category?.href === `/category/${slug}`);
  return listed ? listed.images[0] : null;
}

export function getSubcategory(categorySlug, subcategorySlug) {
  const category = getCategory(categorySlug);
  if (!category) return null;
  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug);
  return subcategory ? { category, subcategory } : null;
}

/* --------------------------------------------------------------------- blogs */

export function getAllBlogPosts() {
  return [...blogPosts].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
}

export function getBlogCategories() {
  return blogCategories;
}

export function getBlogCategory(slug) {
  return blogCategories.find((c) => c.slug === slug) || null;
}

export function getBlogPostsByCategory(slug) {
  return getAllBlogPosts().filter((p) => p.categories.includes(slug));
}

export function getBlogPost(id) {
  const numeric = Number(id);
  return blogPosts.find((p) => p.id === numeric) || null;
}

export function getRelatedBlogPosts(post, limit = 3) {
  if (!post) return [];
  const all = getAllBlogPosts().filter((p) => p.id !== post.id);
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

// Read-only repository over the existing DoctorFresh database.
//
// Each loader returns the full collection in the app's own shape, or null when
// the database is unreachable/unconfigured — the catalog layer then serves the
// bundled static data instead. Nothing here writes, alters or migrates.

import { query, isDbEnabled } from '@/lib/db';
import { cached, clearCache } from './cache';
import {
  TABLES, PRODUCT_COLUMNS, CATEGORY_COLUMNS, SUBCATEGORY_COLUMNS, BLOG_COLUMNS,
} from './schema';
import {
  mapProduct, mapCategory, mapBlogPost, mapBlogCategory, mapReview,
  groupAttributes, isLive,
} from './map';
import { ratingFallback } from './rating-fallback';

const cols = (list) => list.map((c) => `\`${c}\``).join(', ');

const num = (v) => Number(v) || 0;

/* ---------------------------------------------------------------- categories */

async function loadCategories() {
  const rows = await query(
    `SELECT ${cols(CATEGORY_COLUMNS)} FROM \`${TABLES.categories}\` ORDER BY \`sort_id\``,
  );
  if (rows === null) return null;

  const subRows = await query(
    `SELECT ${cols(SUBCATEGORY_COLUMNS)} FROM \`${TABLES.subcategories}\` ORDER BY \`sort_id\``,
  );

  // `sub_category.category` is a text column holding the parent category id.
  const byParent = new Map();
  for (const s of subRows || []) {
    const pid = num(s.category);
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(s);
  }

  return rows
    .filter((r) => r.slug_url)
    .map((row) => mapCategory(row, byParent.get(num(row.category_id)) || []));
}

export function getCategoriesFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('categories', loadCategories);
}

/* ------------------------------------------------------------------ products */

async function loadAttributeIndex() {
  const [attributes, filters] = await Promise.all([
    query(`SELECT \`attribute_id\`, \`title\`, \`sort_id\` FROM \`${TABLES.attributes}\``),
    query(`SELECT \`attribute_filter_id\`, \`attribute_id\`, \`title\`, \`sort_id\` FROM \`${TABLES.attributeFilters}\``),
  ]);

  return {
    attributeById: new Map((attributes || []).map((a) => [num(a.attribute_id), a])),
    filterById: new Map((filters || []).map((f) => [num(f.attribute_filter_id), f])),
  };
}

async function loadReviewIndex() {
  const rows = await query(
    `SELECT * FROM \`${TABLES.productReviews}\` ORDER BY \`created_at\` DESC`,
  );

  const byProduct = new Map();
  for (const r of (rows || []).filter((r) => isLive(r))) {
    const pid = num(r.product_id);
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid).push(mapReview(r));
  }
  return byProduct;
}

async function loadProducts() {
  const rows = await query(
    `SELECT ${cols(PRODUCT_COLUMNS)} FROM \`${TABLES.products}\` ORDER BY \`sort_id\``,
  );
  if (rows === null) return null;

  const categories = (await getCategoriesFromDb()) || [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const subById = new Map();
  for (const c of categories) {
    for (const s of c.subcategories) subById.set(s.id, s);
  }

  const [{ attributeById, filterById }, reviewsByProduct] = await Promise.all([
    loadAttributeIndex(),
    loadReviewIndex(),
  ]);

  const products = rows
    // Not filtered on `status`: the live site still serves rows marked '0'
    // (product 1736 returns 200 today), so filtering here would 404 a working URL.
    .filter((row) => row.slug)
    .map((row) => {
      const id = num(row.product_id);
      const filterIds = String(row.attribute_filters || '')
        .split(',').map((s) => num(s)).filter(Boolean);

      return mapProduct(row, {
        category: catById.get(num(row.category)) || null,
        subcategories: String(row.sub_category || '')
          .split(',')
          .map((s) => subById.get(num(s)))
          .filter(Boolean),
        attributes: groupAttributes(filterIds, attributeById, filterById),
        reviews: reviewsByProduct.get(id) || [],
        fallback: ratingFallback[id],
      });
    });

  // Category and subcategory listings are driven by membership, so the id lists
  // are filled in here rather than being stored anywhere.
  for (const c of categories) {
    c.productIds = products.filter((p) => p.category?.href === c.href).map((p) => p.id);
    for (const s of c.subcategories) {
      s.productIds = products.filter((p) => p.subcategoryHrefs.includes(s.href)).map((p) => p.id);
    }
  }

  return products;
}

export function getProductsFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('products', loadProducts);
}

/* --------------------------------------------------------------------- blogs */

async function loadBlogs() {
  const rows = await query(
    `SELECT ${cols(BLOG_COLUMNS)} FROM \`${TABLES.blogs}\` ORDER BY \`date\` DESC`,
  );
  if (rows === null) return null;

  const catRows = await query(
    `SELECT \`blog_category_id\`, \`name\`, \`slug_url\` FROM \`${TABLES.blogCategories}\``,
  );
  const categories = (catRows || []).filter((r) => r.slug_url).map(mapBlogCategory);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  const posts = rows
    .filter((row) => row.blog_url && isLive(row))
    .map((row) => {
      const slug = slugById.get(num(row.blog_category));
      return mapBlogPost(row, slug ? [slug] : []);
    });

  return { posts, categories };
}

export function getBlogsFromDb() {
  if (!isDbEnabled()) return Promise.resolve(null);
  return cached('blogs', loadBlogs);
}

/** Drops the cached catalogue, forcing the next read to hit the database. */
export function clearRepositoryCache() {
  clearCache();
}

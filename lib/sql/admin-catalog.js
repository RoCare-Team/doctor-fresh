// Managing the catalogue from the admin area.
//
// Reads and writes the same rows the PHP admin panel does — `product`,
// `category`, `sub_category`, `blog`, `coupon`, `user` and `general_settings`
// — so both panels stay in step. No column is added and no table is created.

import { query, queryOne, mutate } from '@/lib/db';
import {
  strip, parseSpecTable, parseFaqs, withoutTables, firstWithProse,
} from './html';
import { productImages } from './media';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';
const USERS = process.env.DB_TABLE_USERS || 'user';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

/*
 * A short-lived copy of the lists the admin reads on almost every screen. The
 * database sits about 200ms away per query, so re-reading the same products,
 * categories and brands on each click is most of what makes a page slow. Any
 * change saved through this admin clears the copy at once; an edit made in the
 * old PHP panel shows up within the lifetime below.
 */
const LIST_TTL_MS = 20_000;
const listCache = (globalThis.__dfAdminLists ??= new Map());

function remember(key, loader) {
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.value;
  const value = loader().then((result) => {
    // A failed read (null) is never kept, so the next click tries again.
    if (result === null || result === undefined) listCache.delete(key);
    return result;
  }, (err) => {
    listCache.delete(key);
    throw err;
  });
  listCache.set(key, { at: Date.now(), value });
  return value;
}

/** Drops the cached lists after a write, so the next page shows the change. */
export function forgetAdminLists() {
  listCache.clear();
}

/* ----------------------------------------------------------------- products */

const LIST_COLUMNS = `\`product_id\`, \`title\`, \`slug\`, \`sale_price\`, \`discount\`,
  \`discount_type\`, \`current_stock\`, \`status\`, \`featured\`, \`deal\`, \`category\`,
  \`unit\`, \`num_of_imgs\`, \`sort_id\`, \`brand\``;

function productRow(row, categoryName, brandName = '') {
  const salePrice = num(row.sale_price);
  const discount = num(row.discount);
  const isPercent = String(row.discount_type || '').toLowerCase() === 'percent';
  const price = discount > 0 && salePrice
    ? Math.round((isPercent ? salePrice - (salePrice * discount) / 100 : salePrice - discount) * 100) / 100
    : salePrice;

  return {
    id: row.product_id,
    name: strip(row.title),
    slug: row.slug || '',
    salePrice,
    discount,
    discountType: isPercent ? 'percent' : 'rupee',
    price,
    stock: num(row.current_stock),
    unit: row.unit || '',
    live: String(row.status || '').toLowerCase() !== '0',
    featured: String(row.featured || '').toLowerCase() === 'ok',
    deal: String(row.deal || '').toLowerCase() === 'ok',
    categoryId: num(row.category),
    categoryName: categoryName || '',
    brandId: num(row.brand),
    brandName: brandName || '',
    // The real file on disk — not every product's first photo is numbered 1.
    image: productImages(row.product_id, 1)[0] || `/uploads/product_image/product_${row.product_id}_1.jpg`,
    imageCount: num(row.num_of_imgs, 1),
  };
}

export async function listProducts({
  search = '', categoryId = '', brandId = '', minPrice = '', maxPrice = '', limit = 300,
} = {}) {
  const where = [];
  const params = [];

  if (search) {
    // Search reaches the category and brand names too, so "softener" or
    // "Doctor Fresh" finds products whose own title does not say it.
    where.push(`(p.\`title\` LIKE ? OR p.\`slug\` LIKE ? OR p.\`product_id\` = ?
      OR c.\`category_name\` LIKE ? OR b.\`name\` LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, num(search), `%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    where.push('p.`category` = ?');
    params.push(num(categoryId));
  }
  if (brandId) {
    where.push('p.`brand` = ?');
    params.push(num(brandId));
  }

  const cacheKey = `products|${where.join('&')}|${params.join('|')}|${limit}`;
  const rows = await remember(cacheKey, () => query(
    `SELECT ${LIST_COLUMNS.replace(/`(\w+)`/g, 'p.`$1`')},
            c.\`category_name\` AS \`category_label\`, b.\`name\` AS \`brand_label\`
       FROM \`${PRODUCTS}\` p
       LEFT JOIN \`category\` c ON c.\`category_id\` = p.\`category\`
       LEFT JOIN \`brand\` b ON b.\`brand_id\` = p.\`brand\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.\`sort_id\` ASC LIMIT ?`,
    [...params, Number(limit)],
  ));
  if (rows === null) return null;

  const products = rows.map((r) => productRow(r, strip(r.category_label || ''), strip(r.brand_label || '')));

  // The selling price is worked out from the discount, so the price range is
  // applied to that figure rather than to the stored list price.
  const min = minPrice === '' ? null : num(minPrice);
  const max = maxPrice === '' ? null : num(maxPrice);
  return products.filter((p) => (min === null || p.price >= min) && (max === null || p.price <= max));
}

/** Brands that at least one product uses, with how many — for the filter. */
export async function listProductBrands() {
  const rows = await remember('brands', () => query(
    `SELECT b.\`brand_id\`, b.\`name\`, COUNT(p.\`product_id\`) AS \`products\`
       FROM \`brand\` b
       JOIN \`${PRODUCTS}\` p ON p.\`brand\` = b.\`brand_id\`
      GROUP BY b.\`brand_id\`, b.\`name\`
      ORDER BY b.\`name\` ASC`,
  ));
  return (rows || []).map((r) => ({ id: r.brand_id, name: strip(r.name), products: num(r.products) }));
}

export async function getProduct(id) {
  const [row, categories] = await Promise.all([
    queryOne(
      `SELECT ${LIST_COLUMNS}, \`meta_title\`, \`meta_description\`, \`tag\`, \`sub_category\`,
              \`description\`, \`description_new\`, \`billing_shipping\`, \`installation_commision\`,
              \`faqs\`
         FROM \`${PRODUCTS}\` WHERE \`product_id\` = ? LIMIT 1`,
      [id],
    ),
    listCategories(),
  ]);
  if (!row) return null;
  const names = new Map((categories || []).map((c) => [c.id, c.name]));

  // The storefront reads the spec table out of whichever column holds one, so
  // the editor is filled from the same place.
  const specs = [parseSpecTable(row.description), parseSpecTable(row.description_new)]
    .find((list) => list.length) || [];

  return {
    ...productRow(row, names.get(num(row.category))),
    metaTitle: row.meta_title || '',
    metaDescription: row.meta_description || '',
    keywords: row.tag || '',
    subCategoryIds: String(row.sub_category || ''),
    // The older half of the catalogue keeps its copy in `description`, next to
    // the spec table; the newer column is preferred when it has real text.
    descriptionHtml: firstWithProse([row.description_new, withoutTables(row.description)]),
    shippingHtml: firstWithProse([row.billing_shipping]),
    installationHtml: firstWithProse([row.installation_commision]),
    specs,
    faqs: parseFaqs(row.faqs),
  };
}

/** `<table>` in the shape the PHP panel and the storefront both already read. */
function specTableHtml(rows) {
  const cells = rows
    .map((r) => ({ label: clean(r?.label, 200), value: clean(r?.value, 500) }))
    .filter((r) => r.label || r.value);

  if (!cells.length) return '';

  const escape = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<table border="1">\n\t<tbody>\n${cells
    .map((r) => `\t\t<tr>\n\t\t\t<td>${escape(r.label)}</td>\n\t\t\t<td>${escape(r.value)}</td>\n\t\t</tr>`)
    .join('\n')}\n\t</tbody>\n</table>`;
}

/** Only the fields the admin form exposes; nothing else on the row is touched. */
export async function updateProduct(id, fields) {
  // The cached admin lists are about to be out of date.
  forgetAdminLists();
  const set = [];
  const values = [];

  const put = (column, value) => { set.push(`\`${column}\` = ?`); values.push(value); };

  if (fields.title !== undefined) put('title', clean(fields.title, 500));
  if (fields.salePrice !== undefined) put('sale_price', num(fields.salePrice));
  if (fields.discount !== undefined) put('discount', String(num(fields.discount)));
  if (fields.discountType !== undefined) put('discount_type', fields.discountType === 'percent' ? 'percent' : 'rupee');
  if (fields.stock !== undefined) put('current_stock', num(fields.stock));
  if (fields.unit !== undefined) put('unit', clean(fields.unit, 50));
  if (fields.categoryId !== undefined) put('category', num(fields.categoryId));
  if (fields.metaTitle !== undefined) put('meta_title', clean(fields.metaTitle, 255));
  if (fields.metaDescription !== undefined) put('meta_description', clean(fields.metaDescription, 255));
  if (fields.keywords !== undefined) put('tag', clean(fields.keywords, 1000));

  // The PHP site reads these as the strings 'ok' / '0', not as flags.
  if (fields.live !== undefined) put('status', fields.live ? 'ok' : '0');
  if (fields.featured !== undefined) put('featured', fields.featured ? 'ok' : 'no');
  if (fields.deal !== undefined) put('deal', fields.deal ? 'ok' : '');

  if (fields.descriptionHtml !== undefined) put('description_new', String(fields.descriptionHtml || ''));
  if (fields.shippingHtml !== undefined) put('billing_shipping', String(fields.shippingHtml || ''));
  if (fields.installationHtml !== undefined) put('installation_commision', String(fields.installationHtml || ''));

  // Capped so a malformed payload cannot write an unbounded column.
  if (Array.isArray(fields.faqs)) {
    put('faqs', JSON.stringify(
      fields.faqs
        .slice(0, 30)
        .map((f) => ({ question: clean(f?.question, 500), answer: clean(f?.answer, 3000) }))
        .filter((f) => f.question && f.answer),
    ));
  }

  // The spec table shares `description` with whatever prose is already there,
  // so only the table part is rewritten.
  if (Array.isArray(fields.specs)) {
    const existing = await queryOne(
      `SELECT \`description\` FROM \`${PRODUCTS}\` WHERE \`product_id\` = ? LIMIT 1`,
      [id],
    );
    const prose = withoutTables(existing?.description).trim();
    const table = specTableHtml(fields.specs.slice(0, 60));
    put('description', [prose, table].filter(Boolean).join('\n\n'));
  }

  if (!set.length) return { ok: true };

  values.push(id);
  await mutate(`UPDATE \`${PRODUCTS}\` SET ${set.join(', ')} WHERE \`product_id\` = ?`, values);
  return { ok: true };
}

/**
 * Subcategories, with the parent category id normalised — it is stored as text
 * on the row.
 */
export async function listSubcategories() {
  const rows = await query(
    'SELECT `sub_category_id`, `sub_category_name`, `category` FROM `sub_category` ORDER BY `sort_id`',
  );
  return (rows || []).map((r) => ({
    id: r.sub_category_id,
    name: strip(r.sub_category_name),
    categoryId: num(r.category),
  }));
}

/** A URL-safe slug, unique against the products already in the table. */
async function uniqueSlug(title) {
  const base = String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';

  const taken = await query(`SELECT \`slug\` FROM \`${PRODUCTS}\` WHERE \`slug\` LIKE ?`, [`${base}%`]);
  const used = new Set((taken || []).map((r) => r.slug));
  if (!used.has(base)) return base;

  for (let n = 2; n < 200; n += 1) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Creates a product with the same defaults the PHP admin writes, so the old
 * panel and the storefront read it exactly like any other row.
 */
export async function createProduct(fields, adminId) {
  // The cached admin lists are about to be out of date.
  forgetAdminLists();
  const title = clean(fields.title, 500);
  if (!title) return { ok: false, reason: 'Enter a product name.' };

  const slug = await uniqueSlug(title);

  const rows = await query(`SELECT MAX(\`sort_id\`) AS m FROM \`${PRODUCTS}\``);
  const sortId = num(rows?.[0]?.m) + 1;

  const row = {
    title,
    slug,
    meta_title: clean(fields.metaTitle, 255) || title,
    meta_description: clean(fields.metaDescription, 255) || title,
    tag: clean(fields.keywords, 1000),
    category: num(fields.categoryId),
    sub_category: clean(fields.subCategoryIds, 355),
    sale_price: num(fields.salePrice),
    purchase_price: num(fields.salePrice),
    discount: String(num(fields.discount)),
    discount_type: fields.discountType === 'percent' ? 'percent' : 'rupee',
    current_stock: num(fields.stock),
    unit: clean(fields.unit, 50) || 'Pc',
    tax: String(num(fields.tax)),
    tax_type: 'percent',
    description: '',
    description_new: String(fields.descriptionHtml ?? '').slice(0, 60_000),
    billing_shipping: '',
    installation_commision: '',
    status: fields.live === false ? '0' : 'ok',
    featured: fields.featured ? 'ok' : 'no',
    deal: fields.deal ? 'ok' : '',

    // The rest are the defaults the PHP panel writes on a new product, so the
    // row is indistinguishable from one created there.
    added_by: JSON.stringify({ type: 'admin', id: String(adminId || '') }),
    add_timestamp: String(Math.floor(Date.now() / 1000)),
    num_of_imgs: '0',
    front_image: '0',
    main_image: '0',
    shipping_cost: '',
    brand: '292',
    additional_fields: JSON.stringify({ name: 'null', value: 'null' }),
    color: '[]',
    options: '[]',
    is_bundle: 'no',
    product_type: 1,
    number_of_view: 0,
    rating_user: '[]',
    rating_num: 0,
    rating_total: 0,
    faqs: '[]',
    sort_id: sortId,
    vendor_sort_id: 0,
    vendor_price: 0,
  };

  // Written out column by column: `INSERT … SET ?` only works on a plain query,
  // and everything here goes through prepared statements.
  const columns = Object.keys(row);
  const result = await mutate(
    `INSERT INTO \`${PRODUCTS}\` (${columns.map((c) => `\`${c}\``).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((c) => row[c]),
  );

  return { ok: true, id: result.insertId, slug };
}

/** Records how many photos a product now has. */
export async function setImageCount(id, count) {
  // The cached admin lists are about to be out of date.
  forgetAdminLists();
  await mutate(`UPDATE \`${PRODUCTS}\` SET \`num_of_imgs\` = ? WHERE \`product_id\` = ?`, [String(num(count)), id]);
}

/* --------------------------------------------------------------- categories */

export async function listCategories() {
  // The product counts ride along in the same query: each trip to this
  // database costs about 200ms, and this list is read on several admin pages.
  const rows = await remember('categories', () => query(
    `SELECT c.\`category_id\`, c.\`category_name\`, c.\`slug_url\`, c.\`meta_title\`, c.\`meta_description\`,
            c.\`sort_id\`, COALESCE(x.\`n\`, 0) AS \`product_count\`, x.\`first_product\`
       FROM \`category\` c
       LEFT JOIN (SELECT \`category\`, COUNT(*) n, MIN(\`product_id\`) AS \`first_product\` FROM \`${PRODUCTS}\` GROUP BY \`category\`) x
         ON x.\`category\` = c.\`category_id\`
      ORDER BY c.\`sort_id\``,
  ));
  if (rows === null) return null;
  const counts = rows.map((r) => ({ category: r.category_id, n: r.product_count }));
  const byCategory = new Map((counts || []).map((c) => [num(c.category), num(c.n)]));

  return rows.map((r) => ({
    id: r.category_id,
    name: strip(r.category_name),
    slug: r.slug_url || '',
    metaTitle: r.meta_title || '',
    metaDescription: r.meta_description || '',
    products: byCategory.get(num(r.category_id)) || 0,
    // A product from the category stands in for a picture of it.
    image: r.first_product ? productImages(r.first_product, 1)[0] || '' : '',
  }));
}

/** Everything the category editor shows, read from the same row the storefront uses. */
export async function getCategory(id) {
  const row = await queryOne(
    `SELECT \`category_id\`, \`category_name\`, \`slug_url\`, \`meta_title\`, \`meta_description\`,
            \`heading_category\`, \`heading_description\`, \`page_content\`, \`faqs\`, \`banner\`,
            (SELECT COUNT(*) FROM \`${PRODUCTS}\` p WHERE p.\`category\` = c.\`category_id\`) AS \`product_count\`
       FROM \`category\` c WHERE \`category_id\` = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;

  return {
    id: row.category_id,
    name: strip(row.category_name),
    slug: row.slug_url || '',
    metaTitle: row.meta_title || '',
    metaDescription: row.meta_description || '',
    heading: strip(row.heading_category),
    intro: strip(row.heading_description),
    pageContentHtml: row.page_content || '',
    faqs: parseFaqs(row.faqs),
    banner: row.banner ? `/uploads/category_image/${row.banner}` : '',
    products: num(row.product_count),
  };
}

export async function updateCategory(id, fields) {
  const set = [];
  const values = [];
  const put = (column, value) => { set.push(`\`${column}\` = ?`); values.push(value); };

  if (fields.name !== undefined) put('category_name', clean(fields.name, 255));
  if (fields.metaTitle !== undefined) put('meta_title', clean(fields.metaTitle, 255));
  if (fields.metaDescription !== undefined) put('meta_description', clean(fields.metaDescription, 255));
  if (fields.heading !== undefined) put('heading_category', clean(fields.heading, 2000));
  if (fields.intro !== undefined) put('heading_description', clean(fields.intro, 2000));
  if (fields.pageContentHtml !== undefined) put('page_content', String(fields.pageContentHtml || '').slice(0, 200_000));
  // The same shape the storefront and the PHP panel read; capped so a
  // malformed payload cannot write an unbounded column.
  if (Array.isArray(fields.faqs)) {
    put('faqs', JSON.stringify(
      fields.faqs
        .slice(0, 40)
        .map((f) => ({ question: clean(f?.question, 500), answer: clean(f?.answer, 3000) }))
        .filter((f) => f.question && f.answer),
    ));
  }
  if (!set.length) return { ok: true };

  values.push(id);
  await mutate(`UPDATE \`category\` SET ${set.join(', ')} WHERE \`category_id\` = ?`, values);
  // Cleared after the write, so no read that raced it can be kept.
  forgetAdminLists();
  return { ok: true };
}

/* ------------------------------------------------------------ subcategories */

/**
 * Every subcategory with its parent id and how many products list it. A
 * product names its subcategories in one comma-separated column, so the count
 * matches on that list. One query, cached with the other admin lists.
 */
export async function listSubcategoryPages() {
  const rows = await remember('subcategory-pages', () => query(
    `SELECT s.\`sub_category_id\`, s.\`sub_category_name\`, s.\`slug_url\`, s.\`category\`,
            s.\`meta_title\`, s.\`meta_description\`,
            (SELECT COUNT(*) FROM \`${PRODUCTS}\` p
              WHERE FIND_IN_SET(s.\`sub_category_id\`, REPLACE(p.\`sub_category\`, ' ', ''))) AS \`product_count\`
       FROM \`sub_category\` s
      ORDER BY s.\`sort_id\``,
  ));
  if (rows === null) return null;

  return rows.map((r) => ({
    id: r.sub_category_id,
    name: strip(r.sub_category_name),
    slug: r.slug_url || '',
    categoryId: num(r.category),
    metaTitle: r.meta_title || '',
    metaDescription: r.meta_description || '',
    products: num(r.product_count),
  }));
}

/** One subcategory as the editor needs it, with its parent for the URL. */
export async function getSubcategoryPage(id) {
  const row = await queryOne(
    `SELECT s.\`sub_category_id\`, s.\`sub_category_name\`, s.\`slug_url\`, s.\`category\`,
            s.\`meta_title\`, s.\`meta_description\`, s.\`keyword\`, s.\`subcat_heading\`,
            s.\`subcat_description\`, s.\`page_content\`, s.\`faqs\`, s.\`banner\`,
            c.\`category_name\`, c.\`slug_url\` AS \`category_slug\`,
            (SELECT COUNT(*) FROM \`${PRODUCTS}\` p
              WHERE FIND_IN_SET(s.\`sub_category_id\`, REPLACE(p.\`sub_category\`, ' ', ''))) AS \`product_count\`
       FROM \`sub_category\` s
       LEFT JOIN \`category\` c ON c.\`category_id\` = s.\`category\`
      WHERE s.\`sub_category_id\` = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;

  return {
    id: row.sub_category_id,
    name: strip(row.sub_category_name),
    slug: row.slug_url || '',
    categoryId: num(row.category),
    categoryName: strip(row.category_name),
    categorySlug: row.category_slug || '',
    metaTitle: row.meta_title || '',
    metaDescription: row.meta_description || '',
    keywords: row.keyword || '',
    heading: strip(row.subcat_heading),
    intro: strip(row.subcat_description),
    pageContentHtml: row.page_content || '',
    faqs: parseFaqs(row.faqs),
    banner: row.banner ? `/uploads/sub_category_image/${row.banner}` : '',
    products: num(row.product_count),
  };
}

/* ------------------------------------------------------ creating new pages */

/** "Water Ionizer for Home" → "water-ionizer-for-home". */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/**
 * `sort_id` carries a unique index on both tables, so a new row takes the
 * next free number — which also puts it at the end of the menus.
 */
async function insertWithNextSort(table, columns, values) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [{ next }] = await query(`SELECT COALESCE(MAX(\`sort_id\`), 0) + 1 AS \`next\` FROM \`${table}\``);
    try {
      const result = await mutate(
        `INSERT INTO \`${table}\` (${[...columns, 'sort_id'].map((c) => `\`${c}\``).join(', ')})
         VALUES (${[...columns, 'sort_id'].map(() => '?').join(', ')})`,
        [...values, num(next) + attempt],
      );
      return result.insertId;
    } catch (err) {
      // Someone else took that number in the same instant; take the next one.
      if (err.code !== 'ER_DUP_ENTRY' || attempt === 2) throw err;
    }
  }
  return null;
}

/**
 * A new category, filled the way the PHP panel fills one: the brand list
 * copied from the most common existing value (every category is Doctor Fresh
 * today), empty subcategory and FAQ lists, and the name as the page heading.
 */
export async function createCategory({ name, slug, metaTitle, metaDescription }) {
  const title = clean(name, 255);
  const cleanSlug = slugify(slug || title);
  if (!title) return { error: 'Enter a category name.' };
  if (!cleanSlug) return { error: 'Enter a URL for the category.' };

  const [taken, brands] = await Promise.all([
    queryOne('SELECT `category_id` FROM `category` WHERE `slug_url` = ? LIMIT 1', [cleanSlug]),
    queryOne(
      `SELECT \`data_brands\` FROM \`category\` WHERE \`data_brands\` <> ''
        GROUP BY \`data_brands\` ORDER BY COUNT(*) DESC LIMIT 1`,
    ),
  ]);
  if (taken) return { error: `A category already uses /category/${cleanSlug}.` };

  const id = await insertWithNextSort(
    'category',
    ['category_name', 'slug_url', 'meta_title', 'meta_description', 'page_content', 'data_brands',
      'data_vendors', 'data_subdets', 'faqs', 'menu_type', 'heading_category', 'heading_description'],
    [title, cleanSlug, clean(metaTitle, 255) || title, clean(metaDescription, 255), '', brands?.data_brands || '',
      '', '[]', '[]', 0, title, ''],
  );
  forgetAdminLists();
  return { id, slug: cleanSlug };
}

/** Rewrites the parent's cached list of its subcategories, which the PHP menus read. */
async function syncSubcategoryList(categoryId, change) {
  const row = await queryOne('SELECT `data_subdets`, `data_brands` FROM `category` WHERE `category_id` = ? LIMIT 1', [categoryId]);
  if (!row) return;
  let list = [];
  try { list = JSON.parse(row.data_subdets || '[]'); } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  const next = change(list, row);
  await mutate('UPDATE `category` SET `data_subdets` = ? WHERE `category_id` = ?', [JSON.stringify(next), categoryId]);
}

/** A new subcategory under a category, at /category/<parent>/<slug>. */
export async function createSubcategory({
  categoryId, name, slug, metaTitle, metaDescription,
}) {
  const parentId = Number(categoryId);
  const title = clean(name, 255);
  const cleanSlug = slugify(slug || title);
  if (!parentId) return { error: 'Choose the parent category.' };
  if (!title) return { error: 'Enter a subcategory name.' };
  if (!cleanSlug) return { error: 'Enter a URL for the subcategory.' };

  const [parent, taken] = await Promise.all([
    queryOne('SELECT `category_id`, `slug_url`, `data_brands` FROM `category` WHERE `category_id` = ? LIMIT 1', [parentId]),
    queryOne('SELECT `sub_category_id` FROM `sub_category` WHERE `category` = ? AND `slug_url` = ? LIMIT 1', [String(parentId), cleanSlug]),
  ]);
  if (!parent) return { error: 'That category no longer exists.' };
  if (taken) return { error: `This category already has /${cleanSlug}.` };

  // The same brands as the parent, in the shape this column uses: ["292"].
  const brandIds = String(parent.data_brands || '').split(',').map((b) => b.split(':::')[0].trim()).filter(Boolean);

  const id = await insertWithNextSort(
    'sub_category',
    ['sub_category_name', 'slug_url', 'keyword', 'meta_title', 'meta_description', 'page_content', 'category',
      'brand', 'banner', 'faqs', 'subcat_heading', 'subcat_description'],
    [title, cleanSlug, title.slice(0, 200), clean(metaTitle, 255) || title, clean(metaDescription, 255), '', String(parentId),
      JSON.stringify(brandIds), '', '[]', title, ''],
  );

  await syncSubcategoryList(parentId, (list) => [
    ...list,
    { sub_id: String(id), sub_name: title, min: 0, max: 0, brands: parent.data_brands || '' },
  ]);
  forgetAdminLists();
  return { id, categoryId: parentId, categorySlug: parent.slug_url, slug: cleanSlug };
}

/*
 * Deleting. Only an empty page can go: a category with products or
 * subcategories, or a subcategory with products, would leave those products
 * pointing at nothing — on this site and on the PHP one.
 */

export async function deleteCategory(id) {
  const [row, counts] = await Promise.all([
    queryOne('SELECT `category_id`, `slug_url` FROM `category` WHERE `category_id` = ? LIMIT 1', [id]),
    queryOne(
      `SELECT (SELECT COUNT(*) FROM \`${PRODUCTS}\` WHERE \`category\` = ?) AS \`products\`,
              (SELECT COUNT(*) FROM \`sub_category\` WHERE \`category\` = ?) AS \`subs\``,
      [id, String(id)],
    ),
  ]);
  if (!row) return { error: 'That category no longer exists.' };
  if (num(counts?.products)) return { error: `It still has ${num(counts.products)} products — move them to another category first.` };
  if (num(counts?.subs)) return { error: `It still has ${num(counts.subs)} subcategories — delete those first.` };

  await mutate('DELETE FROM `category` WHERE `category_id` = ?', [id]);
  forgetAdminLists();
  return { ok: true, path: `/category/${row.slug_url}` };
}

export async function deleteSubcategory(id) {
  const row = await queryOne(
    `SELECT s.\`sub_category_id\`, s.\`slug_url\`, s.\`category\`, c.\`slug_url\` AS \`category_slug\`,
            (SELECT COUNT(*) FROM \`${PRODUCTS}\` p
              WHERE FIND_IN_SET(s.\`sub_category_id\`, REPLACE(p.\`sub_category\`, ' ', ''))) AS \`products\`
       FROM \`sub_category\` s
       LEFT JOIN \`category\` c ON c.\`category_id\` = s.\`category\`
      WHERE s.\`sub_category_id\` = ? LIMIT 1`,
    [id],
  );
  if (!row) return { error: 'That subcategory no longer exists.' };
  if (num(row.products)) return { error: `It still has ${num(row.products)} products — move them to another subcategory first.` };

  await mutate('DELETE FROM `sub_category` WHERE `sub_category_id` = ?', [id]);
  await syncSubcategoryList(num(row.category), (list) => list.filter((s) => String(s?.sub_id) !== String(id)));
  forgetAdminLists();
  return {
    ok: true,
    path: `/category/${row.category_slug}/${row.slug_url}`,
    parentPath: `/category/${row.category_slug}`,
    categoryId: num(row.category),
  };
}

/** Same fields as a category, written to the subcategory's own columns. */
export async function updateSubcategory(id, fields) {
  const set = [];
  const values = [];
  const put = (column, value) => { set.push(`\`${column}\` = ?`); values.push(value); };

  if (fields.name !== undefined) put('sub_category_name', clean(fields.name, 255));
  if (fields.metaTitle !== undefined) put('meta_title', clean(fields.metaTitle, 255));
  if (fields.metaDescription !== undefined) put('meta_description', clean(fields.metaDescription, 255));
  if (fields.keywords !== undefined) put('keyword', clean(fields.keywords, 1000));
  if (fields.heading !== undefined) put('subcat_heading', clean(fields.heading, 2000));
  if (fields.intro !== undefined) put('subcat_description', clean(fields.intro, 2000));
  if (fields.pageContentHtml !== undefined) put('page_content', String(fields.pageContentHtml || '').slice(0, 200_000));
  if (Array.isArray(fields.faqs)) {
    put('faqs', JSON.stringify(
      fields.faqs
        .slice(0, 40)
        .map((f) => ({ question: clean(f?.question, 500), answer: clean(f?.answer, 3000) }))
        .filter((f) => f.question && f.answer),
    ));
  }
  if (!set.length) return { ok: true };

  values.push(id);
  await mutate(`UPDATE \`sub_category\` SET ${set.join(', ')} WHERE \`sub_category_id\` = ?`, values);
  // A renamed subcategory is renamed in the parent's cached list too, so the
  // PHP menus do not keep showing the old name.
  if (fields.name !== undefined) {
    const row = await queryOne('SELECT `category` FROM `sub_category` WHERE `sub_category_id` = ? LIMIT 1', [id]);
    if (row?.category) {
      const name = clean(fields.name, 255);
      await syncSubcategoryList(num(row.category), (list) => list.map((s) => (
        String(s?.sub_id) === String(id) ? { ...s, sub_name: name } : s
      )));
    }
  }
  forgetAdminLists();
  return { ok: true };
}

/* ---------------------------------------------------------------- customers */

export async function listCustomers({ search = '', limit = 200 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(`username` LIKE ? OR `phone` LIKE ? OR `email` LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Both reads at once — each round trip to this database costs about 200ms.
  // The order totals are one grouped query rather than a count per customer.
  const [rows, orders] = await Promise.all([
    query(
      `SELECT \`user_id\`, \`username\`, \`surname\`, \`email\`, \`phone\`, \`city\`, \`creation_date\`, \`last_login\`
         FROM \`${USERS}\`
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY \`user_id\` DESC LIMIT ?`,
      [...params, Number(limit)],
    ),
    query('SELECT `buyer`, COUNT(*) n, SUM(`grand_total`) total FROM `sale` GROUP BY `buyer`'),
  ]);
  if (rows === null) return null;
  const byBuyer = new Map((orders || []).map((o) => [String(o.buyer), { n: num(o.n), total: num(o.total) }]));

  return rows.map((r) => {
    const stats = byBuyer.get(String(r.user_id)) || { n: 0, total: 0 };
    return {
      id: r.user_id,
      name: [r.username, r.surname].filter(Boolean).join(' ') || '—',
      email: r.email || '',
      mobile: r.phone || '',
      city: r.city || '',
      orders: stats.n,
      spent: stats.total,
      joined: r.creation_date ? new Date(num(r.creation_date) * 1000).toISOString() : null,
    };
  });
}

/**
 * One customer, with the orders they have placed. The orders are the same
 * `sale` rows the order list reads, so a row opened from here and from
 * /admin/orders is the same order.
 */
export async function getCustomer(userId) {
  const row = await queryOne(
    `SELECT \`user_id\`, \`username\`, \`surname\`, \`email\`, \`phone\`, \`address1\`, \`address2\`,
            \`city\`, \`state\`, \`zip\`, \`creation_date\`, \`last_login\`, \`wishlist\`
       FROM \`${USERS}\` WHERE \`user_id\` = ? LIMIT 1`,
    [userId],
  );
  if (!row) return null;

  const sales = await query(
    `SELECT \`sale_id\`, \`sale_code\`, \`grand_total\`, \`payment_type\`, \`payment_status\`,
            \`delivery_status\`, \`created_at\`, \`sale_datetime\`, \`product_details\`
       FROM \`sale\` WHERE \`buyer\` = ? ORDER BY \`sale_id\` DESC`,
    [String(userId)],
  );

  const orders = (sales || []).map((s) => {
    let items = [];
    try {
      items = Object.values(JSON.parse(s.product_details || '{}'));
    } catch { /* a malformed row still shows its total */ }

    return {
      id: s.sale_id,
      code: s.sale_code,
      total: num(s.grand_total),
      paymentType: s.payment_type,
      paid: firstStatus(s.payment_status, 'due') === 'paid',
      delivery: firstStatus(s.delivery_status, 'pending'),
      placedAt: Number(s.sale_datetime) > 0 ? Number(s.sale_datetime) * 1000 : s.created_at,
      itemCount: items.reduce((n, i) => n + num(i.qty, 1), 0),
    };
  });

  let wishlist = [];
  try {
    wishlist = JSON.parse(row.wishlist || '[]');
  } catch { /* an unreadable wishlist is simply not shown */ }

  return {
    id: row.user_id,
    name: [row.username, row.surname].filter(Boolean).join(' ') || '—',
    email: row.email || '',
    mobile: row.phone || '',
    address: [row.address1, row.address2].filter(Boolean).join(', '),
    city: row.city || '',
    state: row.state || '',
    zip: row.zip || '',
    joined: row.creation_date ? new Date(num(row.creation_date) * 1000).toISOString() : null,
    lastLogin: row.last_login ? new Date(num(row.last_login) * 1000).toISOString() : null,
    wishlistCount: Array.isArray(wishlist) ? wishlist.length : 0,
    orders,
    // Money that has actually been collected, and what is still owed.
    spent: orders.filter((o) => o.paid).reduce((sum, o) => sum + o.total, 0),
    due: orders.filter((o) => !o.paid && o.delivery !== 'order cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };
}

/** The statuses live inside JSON in both status columns. */
function firstStatus(json, fallback) {
  try {
    return JSON.parse(json || '[]')[0]?.status || fallback;
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------- blogs */

export async function listBlogs({ limit = 200 } = {}) {
  const [rows, cats] = await Promise.all([
    query(
      'SELECT `blog_id`, `title`, `blog_url`, `author`, `date`, `blog_category`, `status`, `number_of_view` FROM `blog` ORDER BY `blog_id` DESC LIMIT ?',
      [Number(limit)],
    ),
    query('SELECT `blog_category_id`, `name` FROM `blog_category` ORDER BY `blog_category_id`'),
  ]);
  if (rows === null) return null;
  const names = new Map((cats || []).map((c) => [num(c.blog_category_id), strip(c.name)]));

  return rows.map((r) => ({
    id: r.blog_id,
    title: strip(r.title),
    slug: r.blog_url || '',
    author: r.author || '',
    date: r.date || '',
    category: names.get(num(r.blog_category)) || '',
    views: num(r.number_of_view),
    live: String(r.status || '').toLowerCase() !== '0',
  }));
}

export async function getBlog(id) {
  const row = await queryOne(
    'SELECT `blog_id`, `title`, `blog_url`, `summery`, `author`, `date`, `description`, `meta_description`, `blog_category` FROM `blog` WHERE `blog_id` = ? LIMIT 1',
    [id],
  );
  if (!row) return null;

  return {
    id: row.blog_id,
    title: row.title || '',
    slug: row.blog_url || '',
    excerpt: row.summery || '',
    author: row.author || '',
    date: String(row.date || '').slice(0, 10),
    contentHtml: row.description || '',
    metaDescription: row.meta_description || '',
    categoryId: num(row.blog_category),
  };
}

export async function updateBlog(id, fields) {
  const set = [];
  const values = [];
  const put = (c, v) => { set.push(`\`${c}\` = ?`); values.push(v); };

  if (fields.title !== undefined) put('title', clean(fields.title, 500));
  if (fields.excerpt !== undefined) put('summery', clean(fields.excerpt, 1000));
  if (fields.author !== undefined) put('author', clean(fields.author, 500));
  if (fields.date !== undefined) put('date', clean(fields.date, 200));
  if (fields.metaDescription !== undefined) put('meta_description', clean(fields.metaDescription, 5000));
  if (fields.contentHtml !== undefined) put('description', String(fields.contentHtml ?? '').slice(0, 200_000));
  if (fields.categoryId !== undefined) put('blog_category', String(num(fields.categoryId)));

  if (!set.length) return { ok: true };
  values.push(id);
  await mutate(`UPDATE \`blog\` SET ${set.join(', ')} WHERE \`blog_id\` = ?`, values);
  return { ok: true };
}

export async function listBlogCategories() {
  const rows = await query(
    'SELECT `blog_category_id`, `name`, `slug_url` FROM `blog_category` ORDER BY `blog_category_id`',
  );
  return (rows || []).map((r) => ({ id: r.blog_category_id, name: strip(r.name), slug: r.slug_url }));
}

/* ------------------------------------------------------------------ coupons */

export async function listCoupons({ limit = 200 } = {}) {
  const rows = await query('SELECT `coupon_id`, `title`, `code`, `till`, `spec` FROM `coupon` ORDER BY `coupon_id` DESC LIMIT ?', [Number(limit)]);
  if (rows === null) return null;

  const today = new Date().toISOString().slice(0, 10);

  return rows.map((r) => {
    let spec = {};
    try { spec = JSON.parse(r.spec || '{}'); } catch { /* shown as-is below */ }
    return {
      id: r.coupon_id,
      title: r.title || '',
      code: r.code || '',
      till: r.till || '',
      type: String(spec.discount_type || ''),
      value: num(spec.discount_value),
      expired: Boolean(r.till) && r.till < today,
    };
  });
}

export async function createCoupon({ title, code, till, type, value }) {
  const spec = JSON.stringify({
    set_type: 'all_products',
    set: 'null',
    discount_type: type === 'percent' ? 'percent' : 'amount',
    discount_value: String(num(value)),
    shipping_free: null,
  });

  const result = await mutate(
    "INSERT INTO `coupon` (`title`, `spec`, `added_by`, `till`, `code`, `status`, `vendor`, `user`) VALUES (?, ?, 'admin', ?, ?, 'ok', '', '')",
    [clean(title, 255), spec, clean(till, 20), clean(code, 100)],
  );
  return result.insertId;
}

export async function deleteCoupon(id) {
  await mutate('DELETE FROM `coupon` WHERE `coupon_id` = ?', [id]);
  return { ok: true };
}

/* ----------------------------------------------------------------- settings */

/** The settings the admin area exposes; the rest of the table is left alone. */
export const EDITABLE_SETTINGS = [
  { key: 'system_name', label: 'Site name' },
  { key: 'system_title', label: 'Browser title' },
  { key: 'meta_description', label: 'Default meta description', long: true },
  { key: 'contact_phone', label: 'Contact phone' },
  { key: 'contact_email', label: 'Contact email' },
  { key: 'contact_website', label: 'Website' },
  { key: 'contact_address', label: 'Address (HTML)', long: true },
  { key: 'footer_text', label: 'Footer about text', long: true },
];

export async function getSettingsForAdmin() {
  const keys = EDITABLE_SETTINGS.map((s) => s.key);
  const rows = await query(
    `SELECT \`type\`, \`value\` FROM \`general_settings\` WHERE \`type\` IN (${keys.map(() => '?').join(',')})`,
    keys,
  );
  if (rows === null) return null;
  return Object.fromEntries(rows.map((r) => [r.type, r.value ?? '']));
}

export async function updateSettings(values) {
  const allowed = new Set(EDITABLE_SETTINGS.map((s) => s.key));

  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) continue;
    await mutate('UPDATE `general_settings` SET `value` = ? WHERE `type` = ?', [String(value ?? ''), key]);
  }
  return { ok: true };
}

/* --------------------------------------------------------------- brochures */

/**
 * Every product with what its generated brochure would actually contain.
 *
 * The PDF is drawn from the catalogue row, so "how good is this brochure" is
 * really "how much of this product has been filled in" — which is what this
 * page is for.
 */
export async function listBrochures({ search = '', limit = 300 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(`title` LIKE ? OR `slug` LIKE ? OR `product_id` = ?)');
    params.push(`%${search}%`, `%${search}%`, num(search));
  }

  const rows = await query(
    `SELECT \`product_id\`, \`title\`, \`slug\`, \`sale_price\`, \`discount\`, \`discount_type\`,
            \`num_of_imgs\`, \`num_of_downloads\`, \`description\`, \`description_new\`, \`faqs\`,
            \`category\`, \`status\`, \`unit\`, \`current_stock\`, \`featured\`, \`deal\`, \`sort_id\`
       FROM \`${PRODUCTS}\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY \`sort_id\` ASC LIMIT ?`,
    [...params, Number(limit)],
  );
  if (rows === null) return null;

  const categories = await listCategories();
  const names = new Map((categories || []).map((c) => [c.id, c.name]));

  return rows.map((row) => {
    const specs = [parseSpecTable(row.description), parseSpecTable(row.description_new)]
      .find((list) => list.length) || [];
    const description = firstWithProse([row.description_new, withoutTables(row.description)]);

    return {
      ...productRow(row, names.get(num(row.category))),
      downloads: num(row.num_of_downloads),
      hasPhoto: num(row.num_of_imgs) > 0,
      hasDescription: Boolean(description),
      specCount: specs.length,
      faqCount: parseFaqs(row.faqs).length,
    };
  });
}

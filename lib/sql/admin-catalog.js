// Managing the catalogue from the admin area.
//
// Reads and writes the same rows the PHP admin panel does — `product`,
// `category`, `sub_category`, `blog`, `coupon`, `user` and `general_settings`
// — so both panels stay in step. No column is added and no table is created.

import { query, queryOne, mutate } from '@/lib/db';
import {
  strip, parseSpecTable, parseFaqs, withoutTables, firstWithProse,
} from './html';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';
const USERS = process.env.DB_TABLE_USERS || 'user';

const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);

/* ----------------------------------------------------------------- products */

const LIST_COLUMNS = `\`product_id\`, \`title\`, \`slug\`, \`sale_price\`, \`discount\`,
  \`discount_type\`, \`current_stock\`, \`status\`, \`featured\`, \`deal\`, \`category\`,
  \`unit\`, \`num_of_imgs\`, \`sort_id\``;

function productRow(row, categoryName) {
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
    image: `/uploads/product_image/product_${row.product_id}_1.jpg`,
    imageCount: num(row.num_of_imgs, 1),
  };
}

export async function listProducts({ search = '', categoryId = '', limit = 300 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(`title` LIKE ? OR `slug` LIKE ? OR `product_id` = ?)');
    params.push(`%${search}%`, `%${search}%`, num(search));
  }
  if (categoryId) {
    where.push('`category` = ?');
    params.push(num(categoryId));
  }

  const rows = await query(
    `SELECT ${LIST_COLUMNS} FROM \`${PRODUCTS}\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY \`sort_id\` ASC LIMIT ?`,
    [...params, Number(limit)],
  );
  if (rows === null) return null;

  const categories = await listCategories();
  const names = new Map((categories || []).map((c) => [c.id, c.name]));

  return rows.map((r) => productRow(r, names.get(num(r.category))));
}

export async function getProduct(id) {
  const row = await queryOne(
    `SELECT ${LIST_COLUMNS}, \`meta_title\`, \`meta_description\`, \`tag\`, \`sub_category\`,
            \`description\`, \`description_new\`, \`billing_shipping\`, \`installation_commision\`,
            \`faqs\`
       FROM \`${PRODUCTS}\` WHERE \`product_id\` = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;

  const categories = await listCategories();
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
  await mutate(`UPDATE \`${PRODUCTS}\` SET \`num_of_imgs\` = ? WHERE \`product_id\` = ?`, [String(num(count)), id]);
}

/* --------------------------------------------------------------- categories */

export async function listCategories() {
  const rows = await query(
    'SELECT `category_id`, `category_name`, `slug_url`, `meta_title`, `meta_description`, `sort_id` FROM `category` ORDER BY `sort_id`',
  );
  if (rows === null) return null;

  const counts = await query(`SELECT \`category\`, COUNT(*) n FROM \`${PRODUCTS}\` GROUP BY \`category\``);
  const byCategory = new Map((counts || []).map((c) => [num(c.category), num(c.n)]));

  return rows.map((r) => ({
    id: r.category_id,
    name: strip(r.category_name),
    slug: r.slug_url || '',
    metaTitle: r.meta_title || '',
    metaDescription: r.meta_description || '',
    products: byCategory.get(num(r.category_id)) || 0,
  }));
}

export async function updateCategory(id, fields) {
  const set = [];
  const values = [];

  if (fields.name !== undefined) { set.push('`category_name` = ?'); values.push(clean(fields.name, 255)); }
  if (fields.metaTitle !== undefined) { set.push('`meta_title` = ?'); values.push(clean(fields.metaTitle, 255)); }
  if (fields.metaDescription !== undefined) { set.push('`meta_description` = ?'); values.push(clean(fields.metaDescription, 255)); }
  if (!set.length) return { ok: true };

  values.push(id);
  await mutate(`UPDATE \`category\` SET ${set.join(', ')} WHERE \`category_id\` = ?`, values);
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

  const rows = await query(
    `SELECT \`user_id\`, \`username\`, \`surname\`, \`email\`, \`phone\`, \`city\`, \`creation_date\`, \`last_login\`
       FROM \`${USERS}\`
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY \`user_id\` DESC LIMIT ?`,
    [...params, Number(limit)],
  );
  if (rows === null) return null;

  // One grouped query rather than a count per customer.
  const orders = await query('SELECT `buyer`, COUNT(*) n, SUM(`grand_total`) total FROM `sale` GROUP BY `buyer`');
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

/* -------------------------------------------------------------------- blogs */

export async function listBlogs({ limit = 200 } = {}) {
  const rows = await query(
    'SELECT `blog_id`, `title`, `blog_url`, `author`, `date`, `blog_category`, `status`, `number_of_view` FROM `blog` ORDER BY `blog_id` DESC LIMIT ?',
    [Number(limit)],
  );
  if (rows === null) return null;

  const cats = await query('SELECT `blog_category_id`, `name` FROM `blog_category` ORDER BY `blog_category_id`');
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

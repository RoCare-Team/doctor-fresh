// Turns raw SQL rows into the exact object shape the UI already consumes.
//
// The components were built against /data/products.js, /data/categories.js and
// /data/blogs.js. Keeping the mappers faithful to those shapes means switching
// from static data to SQL changes nothing above this layer.

import { REJECTED_STATUS } from './schema';
import {
  strip, delinkDomain, parseSeoSections, parseSpecTable, parseFaqs,
  withoutTables, firstWithProse,
} from './html';
import { productImages, blogImage } from './media';

/* ------------------------------------------------------------------ helpers */

function num(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * `status` is free text in this schema ('ok', 'no', null, ...). Anything not
 * explicitly rejected stays live, which is what the PHP site does today — a
 * null status must not hide a product that is currently on sale.
 */
export function isLive(row, column = 'status') {
  const v = row?.[column];
  if (v === null || v === undefined || v === '') return true;
  return !REJECTED_STATUS.has(String(v).trim().toLowerCase());
}

/* ------------------------------------------------------------------ products */

/**
 * Pricing mirrors the storefront exactly:
 *   no discount        → price = sale_price, no MRP shown
 *   discount 'percent' → price = sale_price − n%,  MRP = sale_price
 *   discount in rupees → price = sale_price − ₹n, MRP = sale_price
 */
function pricing(row) {
  const salePrice = num(row.sale_price);
  const discount = num(row.discount);
  const isPercent = String(row.discount_type || '').toLowerCase() === 'percent';

  if (!salePrice || discount <= 0) {
    return { price: salePrice, mrp: 0, saveLabel: '', discountPercent: 0 };
  }

  // Kept to the paisa: the storefront prints 2422.5, not 2423.
  const raw = isPercent ? salePrice - (salePrice * discount) / 100 : salePrice - discount;
  const price = Math.round(raw * 100) / 100;

  return {
    price,
    mrp: salePrice,
    saveLabel: isPercent ? `Save: ${discount} %` : `Save: ₹${discount}`,
    discountPercent: Math.round(((salePrice - price) / salePrice) * 100),
  };
}

/**
 * The storefront shows a star rating on every card, but `rating_num` is 0 for
 * the whole catalogue — the PHP theme renders a default instead. The values
 * captured from the live pages are reused so cards look unchanged, and a real
 * rating takes over as soon as one exists in the database.
 */
function ratings(row, fallback) {
  const count = num(row.rating_num);
  const total = num(row.rating_total);

  if (count > 0) {
    return {
      rating: Math.round((total / count) * 10) / 10,
      ratingWidget: 4.6,
      reviewCount: count,
    };
  }

  return {
    rating: fallback?.rating ?? 4.5,
    ratingWidget: 4.6,
    reviewCount: fallback?.reviewCount ?? 25,
  };
}

export function mapProduct(row, ctx = {}) {
  const { category, subcategories = [], attributes = [], reviews = [], fallback } = ctx;

  const id = num(row.product_id);
  const name = strip(row.title);
  const slug = row.slug || '';
  const primarySub = subcategories[0] || null;

  return {
    id,
    slug,
    name,
    url: `/product/${slug}/${id}`,
    metaTitle: strip(row.meta_title) || name,
    metaDescription: strip(row.meta_description),
    keywords: row.tag || '',

    category: category ? { name: category.name, href: category.href } : null,
    subcategory: primarySub ? { name: primarySub.name, href: primarySub.href } : null,
    // A product can sit in several subcategories ("160,121,145,..."); the card
    // shows the first, but every listing page it belongs to must still find it.
    subcategoryHrefs: subcategories.map((s) => s.href),

    ...pricing(row),
    unit: row.unit ? `/${String(row.unit).trim()}` : '',
    ...ratings(row, fallback),

    inStock: num(row.current_stock) > 0,
    maxQty: num(row.current_stock, 100) || 100,
    badges: [
      ...(String(row.featured).toLowerCase() === 'ok' ? ['Featured'] : []),
      ...(String(row.deal).toLowerCase() === 'ok' ? ['Today’s Deal'] : []),
    ],

    images: productImages(id, row.num_of_imgs),
    attributes,
    // The table lives in either column depending on when the product was added.
    specifications: [parseSpecTable(row.description), parseSpecTable(row.description_new)]
      .find((list) => list.length) || [],

    // `description_new` is the newer column, but most of the catalogue predates
    // it and still keeps its copy in `description` alongside the spec table.
    descriptionHtml: delinkDomain(firstWithProse([
      row.description_new,
      withoutTables(row.description),
    ])).trim(),
    installationHtml: delinkDomain(firstWithProse([row.installation_commision])).trim(),
    shippingHtml: delinkDomain(firstWithProse([row.billing_shipping])).trim(),

    reviews,
    faqs: parseFaqs(row.faqs),

    sortId: num(row.sort_id, 9999),
  };
}

export function mapReview(row) {
  return {
    id: num(row.product_reviews_id),
    author: strip(row.user_name),
    rating: num(row.rating),
    title: strip(row.title),
    body: strip(row.description),
    date: String(row.created_at || '').slice(0, 10),
  };
}

/* ---------------------------------------------------------------- categories */

function seoFields(html, headingCol, introCol) {
  const seoSections = parseSeoSections(html);
  return {
    heading: strip(headingCol) || seoSections[0]?.title || '',
    intro: strip(introCol) || seoSections[0]?.paragraphs?.[0] || '',
    seoSections,
  };
}

export function mapSubcategory(row, categorySlug) {
  const name = strip(row.sub_category_name);
  const slug = row.slug_url || '';

  return {
    id: num(row.sub_category_id),
    slug,
    name,
    href: `/category/${categorySlug}/${slug}`,
    metaTitle: strip(row.meta_title) || name,
    metaDescription: strip(row.meta_description),
    // The admin panel fills this per subcategory; nothing was reading it.
    keywords: strip(row.keyword),
    ...seoFields(row.page_content, row.subcat_heading, row.subcat_description),
    faqs: parseFaqs(row.faqs),
    productIds: [],
    sortId: num(row.sort_id, 9999),
  };
}

export function mapCategory(row, subcategoryRows = []) {
  // Some category names carry a stray leading space in the admin data.
  const name = strip(row.category_name);
  const slug = row.slug_url || '';

  return {
    id: num(row.category_id),
    slug,
    name,
    href: `/category/${slug}`,
    metaTitle: strip(row.meta_title) || name,
    metaDescription: strip(row.meta_description),
    ...seoFields(row.page_content, row.heading_category, row.heading_description),
    faqs: parseFaqs(row.faqs),
    productIds: [],
    // "292:::Doctor Fresh" — id and label packed into one column.
    brands: String(row.data_brands || '')
      .split(',')
      .map((entry) => {
        const [id, label] = entry.split(':::');
        return id && label ? { id: num(id), name: label.trim() } : null;
      })
      .filter(Boolean),
    subcategories: subcategoryRows
      .map((s) => mapSubcategory(s, slug))
      .sort((a, b) => a.sortId - b.sortId),
    sortId: num(row.sort_id, 9999),
  };
}

/* --------------------------------------------------------------------- blogs */

export function mapBlogPost(row, categorySlugs = []) {
  const id = num(row.blog_id);
  const title = strip(row.title);
  const slug = row.blog_url || '';
  const content = delinkDomain(row.description);
  const words = strip(content).split(/\s+/).filter(Boolean).length;

  return {
    id,
    slug,
    url: `/blog/${id}/${slug}`,
    title,
    metaTitle: title,
    metaDescription: strip(row.meta_description),
    image: blogImage(id),
    author: strip(row.author) || 'Doctor Fresh',
    date: String(row.date || '').slice(0, 10),
    categories: categorySlugs,
    excerpt: strip(row.summery),
    readingMinutes: Math.max(1, Math.round(words / 200)),
    contentHtml: content,
  };
}

export function mapBlogCategory(row) {
  const name = strip(row.name);
  const slug = row.slug_url || '';
  return { id: num(row.blog_category_id), slug, name, href: `/blogs/${slug}` };
}

/* ---------------------------------------------------------------- attributes */

export function groupAttributes(filterIds, attributeById, filterById) {
  const grouped = new Map();

  for (const fid of filterIds) {
    const filter = filterById.get(fid);
    if (!filter) continue;
    const attribute = attributeById.get(num(filter.attribute_id));
    if (!attribute) continue;

    const label = strip(attribute.title);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(strip(filter.title));
  }

  return [...grouped].map(([label, values]) => ({ label, values }));
}

// Where the app finds things in the existing DoctorFresh database
// (dotindoc_website). Verified against the live schema with
// `node _audit/introspect-db.js` — see _audit/db-schema.json.
//
// This is the only file that knows table and column names. If the backend team
// renames something, change it here (or override with the matching env var) and
// nothing else in the app needs to be touched.

const env = process.env;

export const TABLES = {
  products: env.DB_TABLE_PRODUCTS || 'product',
  categories: env.DB_TABLE_CATEGORIES || 'category',
  subcategories: env.DB_TABLE_SUBCATEGORIES || 'sub_category',
  brands: env.DB_TABLE_BRANDS || 'brand',
  attributes: env.DB_TABLE_ATTRIBUTES || 'attribute',
  attributeFilters: env.DB_TABLE_ATTRIBUTE_FILTERS || 'attribute_filter',
  productReviews: env.DB_TABLE_PRODUCT_REVIEWS || 'product_reviews',
  blogs: env.DB_TABLE_BLOGS || 'blog',
  blogCategories: env.DB_TABLE_BLOG_CATEGORIES || 'blog_category',
  landingPages: env.DB_TABLE_LANDING_PAGES || 'landing_pages',
};

/**
 * Only the columns the frontend actually needs. `description` and
 * `page_content` are longtext and are pulled in the same query because every
 * product/category page renders them.
 */
export const PRODUCT_COLUMNS = [
  'product_id', 'title', 'slug', 'meta_title', 'meta_description', 'tag',
  'category', 'sub_category', 'brand', 'description',
  'sale_price', 'discount', 'discount_type', 'unit',
  'current_stock', 'status', 'num_of_imgs', 'featured', 'deal',
  'rating_num', 'rating_total', 'sort_id', 'faqs', 'attribute_filters',
  'description_new', 'billing_shipping', 'installation_commision',
];

export const CATEGORY_COLUMNS = [
  'category_id', 'category_name', 'slug_url', 'meta_title', 'meta_description',
  'page_content', 'description', 'banner', 'data_brands', 'sort_id', 'faqs',
  'heading_category', 'heading_description',
];

export const SUBCATEGORY_COLUMNS = [
  'sub_category_id', 'sub_category_name', 'slug_url', 'category', 'brand',
  'meta_title', 'meta_description', 'page_content', 'banner', 'sort_id', 'faqs',
  'subcat_heading', 'subcat_description', 'keyword',
];

export const BLOG_COLUMNS = [
  'blog_id', 'title', 'blog_url', 'summery', 'author', 'date',
  'description', 'meta_description', 'blog_category', 'status',
];

/**
 * `status` is a free-text column in this schema ('ok', 'pending', ...) rather
 * than a 0/1 flag, so anything not explicitly rejected is treated as live —
 * matching what the PHP site serves today.
 */
export const REJECTED_STATUS = new Set(['no', 'off', 'inactive', 'deleted', 'draft', 'pending', '0']);

/**
 * The catalogue media ships with the app in /public/uploads, so paths stay
 * site-relative and next/image can optimise them. Point DB_UPLOADS_BASE_URL at
 * a CDN or the old host if the files ever move back off the app.
 */
export const UPLOADS_BASE = (env.DB_UPLOADS_BASE_URL || '/uploads').replace(/\/+$/, '');

export const UPLOAD_DIRS = {
  product: 'product_image',
  blog: 'blog_image',
  category: 'category_image',
  subcategory: 'sub_category_image',
  brand: 'brand_image',
  page: 'page_image',
};

// Service & city pages — the `landing_pages` table — from the admin area.
//
// The same rows the PHP panel edits and the storefront's /[slug] route
// renders: /water-purifier-service, /water-purifier-amc, /ro-service-mumbai…
// About 22,000 rows, so lists are always searched and paged, never loaded whole.
//
// Content and FAQs each have an old and a newer column (`content` /
// `new_content`, `faqs` / `faq_new`) and the newer one wins when filled — so an
// edit is written to whichever column the page is actually showing.

import { query, queryOne, mutate } from '@/lib/db';
import { strip, parseFaqs } from './html';
import { TABLES } from './schema';
import { slugify } from './admin-catalog';

const TABLE = TABLES.landingPages;
const LIVE = 'ok';
const HIDDEN = 'hidden';

const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------------------------------- lists */

// The family counts scan the whole 380 MB table (~2s), so they are kept for a
// few minutes and dropped whenever a page is added, removed or edited here.
const FAMILY_TTL = 5 * 60_000;
const store = globalThis;

export function forgetLandingFamilies() {
  store.__dfLandingFamilies = null;
}

/** The service families (RO Service, AMC, Water Softener…) with page counts. */
export async function landingFamilies() {
  const hit = store.__dfLandingFamilies;
  if (hit && Date.now() - hit.at < FAMILY_TTL) return hit.value;
  const rows = await query(
    `SELECT TRIM(\`service_type\`) AS \`type\`, COUNT(*) AS \`n\`,
            SUM(\`status\` = '${LIVE}') AS \`live\`
       FROM \`${TABLE}\` GROUP BY TRIM(\`service_type\`) ORDER BY \`n\` DESC`,
  );
  if (rows === null) return hit?.value || [];
  const value = rows.map((r) => ({ type: r.type || '', pages: num(r.n), live: num(r.live) }));
  store.__dfLandingFamilies = { at: Date.now(), value };
  return value;
}

/** One page of the list, newest first, filtered by search, family and status. */
export async function listLandingPages({
  search = '', type = '', status = '', page = 1, perPage = 50,
} = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(`page_url` LIKE ? OR `page_name` LIKE ? OR `city` LIKE ? OR `locality` LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (type === '__national') {
    // A family of one page is a national service page (AMC, Installation…).
    where.push(`TRIM(\`service_type\`) IN (SELECT t FROM (SELECT TRIM(\`service_type\`) t FROM \`${TABLE}\` GROUP BY t HAVING COUNT(*) = 1) x)`);
  } else if (type) {
    where.push('TRIM(`service_type`) = ?');
    params.push(type);
  }
  if (status === 'live') where.push(`\`status\` = '${LIVE}'`);
  if (status === 'hidden') where.push(`\`status\` <> '${LIVE}'`);

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * perPage;

  // The count and the rows at once — each trip to this database is ~200ms.
  const [rows, count] = await Promise.all([
    query(
      `SELECT \`page_id\`, \`page_url\`, \`page_name\`, \`meta_title\`, \`service_type\`, \`city\`,
              \`state\`, \`locality\`, \`status\`, \`updated_at\`
         FROM \`${TABLE}\` ${clause}
        ORDER BY \`page_id\` DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    // Unfiltered, the total comes from the family counts instead of a second scan.
    where.length
      ? queryOne(`SELECT COUNT(*) AS \`n\` FROM \`${TABLE}\` ${clause}`, params)
      : landingFamilies().then((fams) => ({ n: fams.reduce((sum, fam) => sum + fam.pages, 0) })),
  ]);
  if (rows === null) return null;

  const total = num(count?.n);
  return {
    rows: rows.map((r) => ({
      id: r.page_id,
      slug: r.page_url,
      name: strip(r.page_name) || r.page_url,
      metaTitle: strip(r.meta_title),
      type: strip(r.service_type),
      place: [r.locality && r.locality !== '0' ? strip(r.locality) : '', strip(r.city), strip(r.state)]
        .filter((p, i, a) => p && a.indexOf(p) === i).join(', '),
      live: r.status === LIVE,
      updatedAt: r.updated_at,
    })),
    total,
    page: Math.max(1, page),
    pages: Math.max(1, Math.ceil(total / perPage)),
    from: total ? offset + 1 : 0,
    to: Math.min(offset + perPage, total),
  };
}

/* ------------------------------------------------------------------ one row */

export async function getLandingPageForEdit(id) {
  const row = await queryOne(
    `SELECT \`page_id\`, \`page_url\`, \`page_name\`, \`page_canonical\`, \`meta_title\`, \`meta_keywords\`,
            \`meta_description\`, \`content\`, \`new_content\`, \`faqs\`, \`faq_new\`, \`product_slider\`,
            \`service_type\`, \`city\`, \`state\`, \`locality\`, \`parent_city\`, \`interlinking_name\`,
            \`status\`, \`created_at\`, \`updated_at\`
       FROM \`${TABLE}\` WHERE \`page_id\` = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;

  const usesNewContent = Boolean(row.new_content?.trim());
  const usesNewFaqs = Boolean(row.faq_new?.trim());

  return {
    id: row.page_id,
    slug: row.page_url || '',
    name: strip(row.page_name),
    linkLabel: strip(row.interlinking_name),
    canonical: row.page_canonical || '',
    metaTitle: row.meta_title || '',
    metaDescription: strip(row.meta_description),
    keywords: row.meta_keywords || '',
    pageContentHtml: (usesNewContent ? row.new_content : row.content) || '',
    usesNewContent,
    faqs: parseFaqs(usesNewFaqs ? row.faq_new : row.faqs),
    usesNewFaqs,
    productIds: String(row.product_slider || '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0),
    type: strip(row.service_type),
    city: strip(row.city),
    state: strip(row.state),
    locality: row.locality && row.locality !== '0' ? strip(row.locality) : '',
    live: row.status === LIVE,
    updatedAt: row.updated_at,
  };
}

async function slugTaken(slug, exceptId = 0) {
  const row = await queryOne(
    `SELECT \`page_id\` FROM \`${TABLE}\` WHERE \`page_url\` = ? AND \`page_id\` <> ? LIMIT 1`,
    [slug, exceptId],
  );
  return Boolean(row);
}

const faqJson = (faqs) => JSON.stringify(
  (Array.isArray(faqs) ? faqs : [])
    .slice(0, 40)
    .map((f) => ({ question: clean(f?.question, 500), answer: clean(f?.answer, 3000) }))
    .filter((f) => f.question && f.answer),
);

/** Saves an edit. Returns { ok, oldSlug, slug } or { error }. */
export async function updateLandingPage(id, fields) {
  const current = await queryOne(
    `SELECT \`page_url\`, \`new_content\`, \`faq_new\` FROM \`${TABLE}\` WHERE \`page_id\` = ? LIMIT 1`,
    [id],
  );
  if (!current) return { error: 'That page no longer exists.' };

  const set = [];
  const values = [];
  const put = (column, value) => { set.push(`\`${column}\` = ?`); values.push(value); };

  let slug = current.page_url;
  if (fields.slug !== undefined) {
    slug = slugify(fields.slug);
    if (!slug) return { error: 'Enter the page URL.' };
    if (slug !== current.page_url && await slugTaken(slug, id)) return { error: `/${slug} is already used by another page.` };
    put('page_url', slug);
  }
  if (fields.name !== undefined) {
    if (!clean(fields.name)) return { error: 'Enter the page heading.' };
    put('page_name', clean(fields.name));
  }
  if (fields.linkLabel !== undefined) put('interlinking_name', clean(fields.linkLabel, 350));
  if (fields.metaTitle !== undefined) put('meta_title', clean(fields.metaTitle));
  if (fields.metaDescription !== undefined) put('meta_description', clean(fields.metaDescription, 1000));
  if (fields.keywords !== undefined) put('meta_keywords', clean(fields.keywords));
  if (fields.canonical !== undefined) put('page_canonical', clean(fields.canonical) || null);
  if (fields.type !== undefined) put('service_type', clean(fields.type, 350));
  if (fields.city !== undefined) put('city', clean(fields.city, 350));
  if (fields.state !== undefined) put('state', clean(fields.state, 350));
  if (fields.locality !== undefined) put('locality', clean(fields.locality, 300) || '0');
  if (fields.live !== undefined) put('status', fields.live ? LIVE : HIDDEN);
  if (Array.isArray(fields.productIds)) {
    put('product_slider', fields.productIds.map(Number).filter((n) => n > 0).slice(0, 30).join(','));
  }
  if (fields.pageContentHtml !== undefined) {
    // Into whichever column the page shows today.
    put(current.new_content?.trim() ? 'new_content' : 'content', String(fields.pageContentHtml || '').slice(0, 500_000));
  }
  if (Array.isArray(fields.faqs)) {
    // The list is saved as JSON in `faqs`; the ready-made HTML copy in
    // `faq_new` would otherwise keep winning, so it is cleared.
    put('faqs', faqJson(fields.faqs));
    if (current.faq_new?.trim()) put('faq_new', null);
  }
  if (!set.length) return { ok: true, oldSlug: current.page_url, slug };

  set.push('`updated_at` = NOW()');
  values.push(id);
  await mutate(`UPDATE \`${TABLE}\` SET ${set.join(', ')} WHERE \`page_id\` = ?`, values);
  return { ok: true, oldSlug: current.page_url, slug };
}

/** A new page, live straight away, ready for its content in the editor. */
export async function createLandingPage({
  name, slug, type, city, state, metaTitle, metaDescription,
}) {
  const title = clean(name);
  const cleanSlug = slugify(slug || title);
  if (!title) return { error: 'Enter the page heading.' };
  if (!cleanSlug) return { error: 'Enter the page URL.' };
  if (await slugTaken(cleanSlug)) return { error: `/${cleanSlug} is already used by another page.` };

  // New pages show the same products as the others in their family.
  const family = clean(type, 350);
  const sibling = family
    ? await queryOne(
      `SELECT \`product_slider\` FROM \`${TABLE}\` WHERE TRIM(\`service_type\`) = ? AND \`product_slider\` <> '' LIMIT 1`,
      [family],
    )
    : null;

  const result = await mutate(
    `INSERT INTO \`${TABLE}\`
       (\`page_name\`, \`page_url\`, \`meta_title\`, \`meta_description\`, \`meta_keywords\`, \`content\`, \`faqs\`,
        \`related_topics\`, \`product_slider\`, \`service_type\`, \`city\`, \`state\`, \`locality\`, \`interlinking_name\`,
        \`status\`, \`created_at\`, \`updated_at\`)
     VALUES (?, ?, ?, ?, '', '', '[]', '[]', ?, ?, ?, ?, '0', ?, '${LIVE}', NOW(), NOW())`,
    [title, cleanSlug, clean(metaTitle) || title, clean(metaDescription, 1000), sibling?.product_slider || '',
      family, clean(city, 350), clean(state, 350), title],
  );
  return { id: result.insertId, slug: cleanSlug };
}

export async function deleteLandingPage(id) {
  const row = await queryOne(`SELECT \`page_url\` FROM \`${TABLE}\` WHERE \`page_id\` = ? LIMIT 1`, [id]);
  if (!row) return { error: 'That page no longer exists.' };
  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`page_id\` = ?`, [id]);
  return { ok: true, slug: row.page_url };
}

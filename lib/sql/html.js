// HTML helpers for the rich-text columns the admin panel stores.
//
// `category.page_content`, `sub_category.page_content` and `product.description`
// hold WYSIWYG HTML. The UI wants structured content (headings with paragraphs
// and bullets, spec label/value pairs), so the same parsing the original
// extraction used is applied here to the raw column instead of to a scraped
// page — which keeps SQL-served pages identical to the current ones.

const ENTITIES = {
  '&nbsp;': ' ', '&amp;': '&', '&#8377;': '₹', '&quot;': '"',
  '&#39;': "'", '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"',
  '&ndash;': '-', '&mdash;': '—', '&lt;': '<', '&gt;': '>', '&deg;': '°',
};

/** Tags out, entities decoded, whitespace collapsed. */
export function strip(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Absolute links back to the old domain become site-relative. */
/**
 * `/water-purifier-amc.php` → `/water-purifier-amc`, keeping any #anchor or
 * ?query after it.
 *
 * The copy in `landing_pages` was written for the PHP site and 1,855 of those
 * rows still link to `.php` URLs. This app serves the same pages without the
 * extension, so every one of those links 404s. Rewriting them here is better
 * than leaving them to a redirect: a crawler follows a direct link, and the
 * visitor never makes the extra round trip.
 */
export function dropPhp(url) {
  const value = String(url ?? '');
  // Another site's .php page is a real page — only our own links are rewritten,
  // and the domain has already been stripped off those by the time we get here.
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(value)) return value;
  return value.replace(/\.php(?=$|[#?])/i, '');
}

export function delinkDomain(html) {
  return String(html || '')
    .replace(/https?:\/\/(www\.)?doctorfresh\.in/g, '')
    // Only inside href, so the word "php" in prose is never touched.
    .replace(/(href=["'])([^"']*)(["'])/gi, (_, open, url, close) => open + dropPhp(url) + close);
}

const SKIP_HEADINGS = /^(Categories|Useful Links|Contact Us|Subtotal|Price|Table Of Content|Frequently Asked Questions|Download Our Brochure|Book Water Purifier Demo|Submit your Request|Thank You)$/i;

/**
 * Split editor HTML into { title, paragraphs, bullets } sections keyed on h2/h3,
 * matching the shape the category and subcategory pages already render.
 */
export function parseSeoSections(html) {
  const source = delinkDomain(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const sections = [];
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]{0,2600}?)(?=<h[23][^>]*>|$)/g;
  let m;

  while ((m = re.exec(source))) {
    const title = strip(m[2]);
    if (!title || title.length > 160 || SKIP_HEADINGS.test(title)) continue;

    const paragraphs = [...m[3].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((x) => strip(x[1])).filter((t) => t.length > 40);
    const bullets = [...m[3].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .map((x) => strip(x[1])).filter((t) => t.length > 25 && t.length < 400);

    if (!paragraphs.length && !bullets.length) continue;
    sections.push({ title, paragraphs: paragraphs.slice(0, 6), bullets: bullets.slice(0, 10) });
  }

  return sections.slice(0, 8);
}

/**
 * Product specifications live as a two-column table inside `description`.
 * Anything that is not a clean label/value pair is ignored.
 */
export function parseSpecTable(html) {
  const rows = [...String(html || '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const specs = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => strip(c[1]));
    if (cells.length < 2) continue;
    const [label, value] = cells;
    if (!label && !value) continue;
    if (label.length > 200) continue;
    specs.push({ label, value });
  }

  return specs;
}

/** FAQ columns are JSON arrays of { question, answer } with HTML answers. */
export function parseFaqs(json) {
  let list;
  try {
    list = JSON.parse(json || '[]');
  } catch {
    // Some landing pages keep their FAQ as ready-made HTML instead.
    return parseFaqHtml(json);
  }
  if (!Array.isArray(list)) return [];

  return list
    .map((f) => ({ question: strip(f?.question), answer: strip(f?.answer) }))
    .filter((f) => f.question && f.answer);
}

/**
 * The HTML FAQ block the PHP admin writes into `landing_pages.faq_new`:
 * `.faq-item` > `.faq-question` (with a "+" toggle) and `.faq-answer`.
 */
export function parseFaqHtml(html) {
  return String(html || '')
    .split(/<div[^>]*class=["'][^"']*\bfaq-item\b[^"']*["'][^>]*>/i)
    .slice(1)
    .map((block) => {
      const q = block.match(/class=["'][^"']*\bfaq-question\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      const a = block.match(/class=["'][^"']*\bfaq-answer\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      return {
        question: strip(String(q?.[1] || '').replace(/<span[^>]*>\s*[+−-]\s*<\/span>/gi, '')),
        answer: strip(a?.[1]),
      };
    })
    .filter((f) => f.question && f.answer);
}

/**
 * The prose half of a description column, with any spec table taken out.
 *
 * `product.description` usually holds a specification table, sometimes plain
 * copy, and occasionally both. The table is rendered separately under
 * Specifications, so showing the column verbatim under Description would print
 * it twice.
 */
export function withoutTables(html) {
  return String(html || '').replace(/<table[\s\S]*?<\/table>/gi, '').trim();
}

/**
 * The first candidate that carries real copy.
 *
 * Several of these columns were filled with placeholders ("abc", "-") when the
 * catalogue was set up, so a column being non-empty is not enough to trust it.
 */
export function firstWithProse(candidates, minLength = 30) {
  for (const html of candidates) {
    if (strip(html).length >= minLength) return String(html);
  }
  return '';
}

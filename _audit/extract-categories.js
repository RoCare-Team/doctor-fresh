const fs = require('fs');
const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#8377;/g, '\u20b9').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '-')
  .replace(/\s+/g, ' ').trim();
const clean = (s) => (s || '').replace(/https:\/\/www\.doctorfresh\.in/g, '').trim();
const meta = (h, re) => { const m = h.match(re); return m ? m[1] : ''; };
const load = (p) => fs.readFileSync(p, 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

/* ---------- mega menu tree from homepage ---------- */
const home = load('pages/home.html');
const navStart = home.indexOf('/all-category');
const navEnd = home.indexOf('Recent Blog');
const nav = home.slice(navStart, navEnd > 0 ? navEnd : navStart + 60000);

const order = [];
const childrenOf = {};
const nameOf = {};
const re = /href="https:\/\/www\.doctorfresh\.in(\/category\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)"[^>]*>([\s\S]*?)<\/a>/g;
let m;
while ((m = re.exec(nav))) {
  const href = m[1];
  const label = strip(m[2]);
  if (!label || label === 'Doctor Fresh') continue;
  const parts = href.split('/').filter(Boolean); // ['category','water-purifier', sub?]
  if (parts.length === 2) {
    if (!order.includes(parts[1])) order.push(parts[1]);
    nameOf[parts[1]] = nameOf[parts[1]] || label;
  } else if (parts.length === 3) {
    const p = parts[1];
    childrenOf[p] = childrenOf[p] || [];
    if (!childrenOf[p].some((c) => c.slug === parts[2])) childrenOf[p].push({ slug: parts[2], name: label });
  }
}
// add categories that only appear in sitemap
for (const line of fs.readFileSync('main-urls.txt', 'utf8').split('\n')) {
  const mm = line.trim().match(/^https:\/\/www\.doctorfresh\.in\/category\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  if (!mm) continue;
  if (!order.includes(mm[1])) order.push(mm[1]);
  if (mm[2]) {
    childrenOf[mm[1]] = childrenOf[mm[1]] || [];
    if (!childrenOf[mm[1]].some((c) => c.slug === mm[2])) {
      childrenOf[mm[1]].push({ slug: mm[2], name: mm[2].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });
    }
  }
}

/* ---------- per-page SEO content ---------- */
function pageInfo(file) {
  if (!fs.existsSync(file)) return null;
  const h = load(file);
  const info = {
    metaTitle: strip(meta(h, /<title>([\s\S]*?)<\/title>/)),
    metaDescription: strip(meta(h, /<meta name="description" content="([^"]*)"/)),
    canonical: clean(meta(h, /<link rel="canonical" href="([^"]+)"/)),
    heading: '',
    intro: '',
    seoSections: [],
    faqs: [],
    productIds: [],
  };
  info.productIds = [...new Set([...h.matchAll(/href="https:\/\/www\.doctorfresh\.in\/product\/[^"]*?\/(\d+)"/g)].map((x) => Number(x[1])))];

  // FAQ accordion
  const faqRe = /<a class="collapsed"[^>]*>\s*(?:<span class="dot"><\/span>)?\s*([\s\S]*?)<\/a>[\s\S]*?<div class="panel-body"[^>]*>([\s\S]*?)<\/div>/g;
  let fm;
  while ((fm = faqRe.exec(h))) {
    const q = strip(fm[1]); const a = strip(fm[2]);
    if (q && a && q.length < 250) info.faqs.push({ question: q, answer: a });
  }

  // long-form SEO section: h2/h3 + following paragraphs, taken after the product grid
  const secRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]{0,2600}?)(?=<h[23][^>]*>|<\/section>)/g;
  let sm;
  while ((sm = secRe.exec(h))) {
    const title = strip(sm[2]);
    const paras = [...sm[3].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((x) => strip(x[1])).filter((t) => t.length > 40);
    const bullets = [...sm[3].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => strip(x[1])).filter((t) => t.length > 25 && t.length < 400);
    if (!title || title.length > 160) continue;
    if (/^(Categories|Useful Links|Contact Us|Subtotal|Price|Table Of Content|Frequently Asked Questions|Download Our Brochure|Book Water Purifier Demo|Submit your Request|Thank You)$/i.test(title)) continue;
    if (!paras.length && !bullets.length) continue;
    info.seoSections.push({ title, paragraphs: paras.slice(0, 6), bullets: bullets.slice(0, 10) });
  }
  if (info.seoSections.length) {
    info.heading = info.seoSections[0].title;
    info.intro = info.seoSections[0].paragraphs[0] || '';
  }
  info.seoSections = info.seoSections.slice(0, 8);
  return info;
}

const fileFor = (href) => 'cat/' + href.replace(/^\//, '').replace(/\//g, '__') + '.html';

const categories = order.map((slug) => {
  const href = '/category/' + slug;
  const info = pageInfo(fileFor(href)) || {};
  const subs = (childrenOf[slug] || []).map((c) => {
    const shref = href + '/' + c.slug;
    const sinfo = pageInfo(fileFor(shref)) || {};
    return {
      slug: c.slug, name: c.name, href: shref,
      metaTitle: sinfo.metaTitle || '', metaDescription: sinfo.metaDescription || '',
      heading: sinfo.heading || '', intro: sinfo.intro || '',
      seoSections: sinfo.seoSections || [], faqs: sinfo.faqs || [],
      productIds: sinfo.productIds || [],
    };
  });
  return {
    slug,
    name: nameOf[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    href,
    metaTitle: info.metaTitle || '', metaDescription: info.metaDescription || '',
    heading: info.heading || '', intro: info.intro || '',
    seoSections: info.seoSections || [], faqs: info.faqs || [],
    productIds: info.productIds || [],
    subcategories: subs,
  };
});

fs.writeFileSync('categories.json', JSON.stringify(categories, null, 2));
console.log('categories', categories.length, 'subcats', categories.reduce((a, c) => a + c.subcategories.length, 0));
categories.forEach((c) => console.log(' -', c.slug, '| subs', c.subcategories.length, '| prods', c.productIds.length, '| faqs', c.faqs.length, '| seo', c.seoSections.length));

const fs = require('fs');
const path = require('path');

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#8377;/g, '\u20b9').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '-')
  .replace(/&hellip;/g, '...').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const clean = (s) => (s || '').replace(/https:\/\/www\.doctorfresh\.in/g, '').trim();

function tabContent(h, id) {
  const start = h.indexOf('id="' + id + '"');
  if (start < 0) return '';
  let i = h.indexOf('>', start) + 1;
  let depth = 1, j = i;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(h))) {
    if (m[0].startsWith('</')) { depth--; if (depth === 0) { j = m.index; break; } }
    else if (!m[0].endsWith('/>')) depth++;
  }
  return h.slice(i, j).trim();
}

function meta(h, re) { const m = h.match(re); return m ? m[1] : ''; }

const files = fs.readdirSync('prod').filter((f) => f.endsWith('.html'));
const products = [];

for (const f of files) {
  let h = fs.readFileSync(path.join('prod', f), 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
       .replace(/<!--[\s\S]*?-->/g, '');

  const canonical = meta(h, /<link rel="canonical" href="([^"]+)"/);
  const cm = canonical.match(/\/product\/(.+)\/(\d+)$/);
  if (!cm) { console.error('skip (no canonical)', f); continue; }
  const slug = cm[1], id = Number(cm[2]);

  const name = strip(meta(h, /<h1[^>]*class="product-title"[^>]*>([\s\S]*?)<\/h1>/));
  if (!name) { console.error('skip (no name)', f); continue; }

  // categories
  const catBlock = h.match(/<div itemprop="brand"[\s\S]*?<\/div>/);
  const cats = [];
  if (catBlock) {
    const re = /href="https:\/\/www\.doctorfresh\.in(\/category\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m; while ((m = re.exec(catBlock[0]))) cats.push({ href: m[1], name: strip(m[2]) });
  }

  // rating
  const rating = parseFloat(meta(h, /data-rateit-value="([\d.]+)"/)) || 0;
  const revLine = strip(meta(h, /<a class="reviews ratings_show"[^>]*>([\s\S]*?)<\/a>/));
  const rm = revLine.match(/([\d.]+)\s*ratings\s*([\d,]+)\s*reviews/i);
  const ratingsAvg = rm ? parseFloat(rm[1]) : rating;
  const reviewCount = rm ? Number(rm[2].replace(/,/g, '')) : 0;

  // price
  const priceBlock = meta(h, /<div class="product-price">([\s\S]*?)<\/div>/) || '';
  // Two markups are in use: products with schema.org offers wrap the amount in
  // <span itemprop="price">, the rest print it straight inside <ins>.
  const insBlock = meta(priceBlock, /<ins[^>]*>([\s\S]*?)<\/ins>/) || '';
  const price =
    parseFloat((meta(priceBlock, /<span itemprop="price">\s*([\d.,]+)/) || '').replace(/,/g, '')) ||
    parseFloat((meta(insBlock, /(?:₹|&#8377;)\s*([\d.,]+)/) || '').replace(/,/g, '')) ||
    0;
  const unit = strip(meta(priceBlock, /<unit>([\s\S]*?)<\/unit>/)) || '';
  const mrpRaw = strip(meta(priceBlock, /<del>([\s\S]*?)<\/del>/));
  const mrp = parseFloat(mrpRaw.replace(/[^\d.]/g, '')) || 0;
  const saveLabel = strip(meta(priceBlock, /<span class="label label-success">([\s\S]*?)<\/span>/));

  // images
  const imgs = [...new Set([...h.matchAll(/xpreview="(https:\/\/www\.doctorfresh\.in\/uploads\/product_image\/[^"]+)"/g)].map((m) => m[1]))];
  const images = imgs.length ? imgs : [`https://www.doctorfresh.in/uploads/product_image/product_${id}_1.jpg`];

  // badges / stock
  const badgeBlock = meta(h, /<div class="badges">([\s\S]*?)<\/div>\s*<img/) || '';
  const badges = [...badgeBlock.matchAll(/<div class="[^"]*">([^<]*)<\/div>/g)].map((m) => strip(m[1])).filter(Boolean);
  const inStock = !/Out Of Stock/i.test(h.slice(h.indexOf('product-title'), h.indexOf('product-title') + 4000));
  const maxQty = Number(meta(h, /class="form-control qty[^"]*"[^>]*max="(\d+)"/)) || null;

  // attributes
  const attrBlock = tabContent(h, 'tab4');
  const attributes = [];
  const liRe = /<li class="col-sm-4">\s*([\s\S]*?)<ul>([\s\S]*?)<\/ul>\s*<\/li>/g;
  let am;
  while ((am = liRe.exec(attrBlock))) {
    const label = strip(am[1]);
    const values = [...am[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => strip(x[1])).filter(Boolean);
    if (label && values.length) attributes.push({ label, values });
  }

  // specification table (tab3)
  const specBlock = tabContent(h, 'tab3');
  const specifications = [];
  const trRe = /<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
  let sm;
  while ((sm = trRe.exec(specBlock))) {
    const k = strip(sm[1]).replace(/\s*:\s*$/, ''), v = strip(sm[2]);
    if (k && v && k.toLowerCase() !== 'attribute') specifications.push({ label: k, value: v });
  }

  const descriptionHtml = clean(tabContent(h, 'tab2'));
  const installationHtml = clean(tabContent(h, 'tab8'));
  const shippingHtml = clean(tabContent(h, 'tab6'));

  // reviews
  const revBlock = tabContent(h, 'tab5');
  const reviews = [];
  const pRe = /<div class="panel">([\s\S]*?)<p class="most__help_Title">([\s\S]*?)<\/p>/g;
  let pm;
  while ((pm = pRe.exec(revBlock))) {
    const b = pm[1];
    reviews.push({
      title: strip(meta(b, /<h4>([\s\S]*?)<\/h4>/)),
      rating: parseFloat(strip(meta(b, /class="btn btn-(?:success|warning|danger)">([\d.]+)/))) || 0,
      text: strip(meta(b, /<div class="review_description">([\s\S]*?)<\/div>/)),
      author: strip(pm[2]).replace(/Certified Buyer/i, '').trim(),
      verified: /Certified Buyer/i.test(pm[2]),
    });
  }

  // faqs
  const faqBlock = tabContent(h, 'tab7');
  const faqs = [];
  const qRe = /<a class="collapsed"[^>]*>\s*<span class="dot"><\/span>\s*([\s\S]*?)<\/a>[\s\S]*?<div class="panel-body"[^>]*>([\s\S]*?)<\/div>/g;
  let qm;
  while ((qm = qRe.exec(faqBlock))) {
    const q = strip(qm[1]), a = strip(qm[2]);
    if (q) faqs.push({ question: q, answer: a });
  }

  products.push({
    id, slug, name,
    url: `/product/${slug}/${id}`,
    metaTitle: strip(meta(h, /<title>([\s\S]*?)<\/title>/)),
    metaDescription: strip(meta(h, /<meta name="description" content="([^"]*)"/)),
    keywords: meta(h, /<meta name="keywords" content="([^"]*)"/),
    category: cats[0] ? { name: cats[0].name, href: cats[0].href } : null,
    subcategory: cats[1] ? { name: cats[1].name, href: cats[1].href } : null,
    price, mrp, unit, saveLabel,
    discountPercent: mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    rating: ratingsAvg, ratingWidget: rating, reviewCount,
    inStock, maxQty, badges,
    images,
    attributes, specifications,
    descriptionHtml, installationHtml, shippingHtml,
    reviews, faqs,
  });
}

products.sort((a, b) => a.id - b.id);
fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
console.log('extracted', products.length);
console.log('with price', products.filter((p) => p.price).length);
console.log('with faqs', products.filter((p) => p.faqs.length).length);
console.log('with reviews', products.filter((p) => p.reviews.length).length);
console.log('with attrs', products.filter((p) => p.attributes.length).length);
console.log('with specs', products.filter((p) => p.specifications.length).length);
console.log('with desc', products.filter((p) => p.descriptionHtml).length);

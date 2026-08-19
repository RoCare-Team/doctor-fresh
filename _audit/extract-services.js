const fs = require('fs');

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#8377;/g, '₹').replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '-').replace(/&hellip;/g, '...')
  .replace(/\s+/g, ' ').trim();

const clean = (s) => (s || '').replace(/https?:\/\/(www\.)?doctorfresh\.in/gi, '').trim();
const meta = (h, re) => { const m = h.match(re); return m ? m[1] : ''; };
const load = (p) => fs.readFileSync(p, 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

function tokenize(text, loc) {
  if (!loc || !text) return text;
  const variants = [loc, loc.toLowerCase(), loc.toUpperCase(), loc.replace(/\b\w/g, (c) => c.toUpperCase())];
  let out = text;
  for (const v of [...new Set(variants)].sort((a, b) => b.length - a.length)) out = out.split(v).join('{location}');
  return out.replace(/\{location\}(\s*\{location\})+/g, '{location}');
}

function extract(file, loc) {
  const h = load(file);
  const T = (s) => tokenize(strip(s), loc);

  const out = {
    metaTitle: T(meta(h, /<title>([\s\S]*?)<\/title>/)),
    metaDescription: T(meta(h, /<meta name="description" content="([^"]*)"/)),
    heading: T(meta(h, /<h1[^>]*>([\s\S]{0,300}?)<\/h1>/)),
    ratingLabel: strip(meta(h, /<div class="service-rating-text">\s*<p>([\s\S]{0,80}?)<\/p>/)),
    packages: [],
    promise: [],
    whyChoose: { title: '', points: [] },
    cta: { title: '', text: '', links: [] },
    contentSections: [],
    faqs: [],
  };

  const groups = h.split('<div class="our-package"').slice(1);
  for (const g of groups) {
    const groupId = meta(g, /id="([^"]+)"/) || '';
    const groupTitle = T(meta(g, /<h2 class="pkg-main-heading">([\s\S]{0,120}?)<\/h2>/));
    for (const pk of g.split('<div class="pkg-container"').slice(1)) {
      const seg = pk.slice(0, 5000);
      const title = T(meta(seg, /<p class="pkg-title">([\s\S]{0,160}?)<\/p>/));
      if (!title) continue;
      const bullets = [...(meta(seg, /<ul class="pkg-description">([\s\S]{0,2500}?)<\/ul>/) || '')
        .matchAll(/<li>([\s\S]{0,400}?)<\/li>/g)].map((m) => T(m[1])).filter(Boolean);
      const priceBlock = meta(seg, /<div class="pkg-price">([\s\S]{0,400}?)<\/div>/) || '';
      const nums = [...priceBlock.matchAll(/([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter(Boolean);
      out.packages.push({
        group: groupId,
        groupTitle,
        title,
        bullets,
        price: nums[0] || null,
        mrp: nums[1] || null,
        productId: Number(meta(pk, /data-product-id="(\d+)"/)) || null,
      });
    }
  }

  out.promise = [...new Set([...h.matchAll(/<div class="cart-assurity-text-p">[\s\S]{0,200}?<p>([\s\S]{0,80}?)<\/p>/g)]
    .map((m) => strip(m[1])).filter(Boolean))];

  const wc = meta(h, /<div class="product-second-section">([\s\S]{0,6000}?)<\/div>/) || '';
  out.whyChoose.title = T(meta(wc, /<h3>([\s\S]{0,250}?)<\/h3>/));
  out.whyChoose.points = [...wc.matchAll(/<li>([\s\S]{0,500}?)<\/li>/g)].map((m) => {
    const label = T(meta(m[1], /<span>([\s\S]{0,120}?)<\/span>/));
    const full = T(m[1]);
    const text = label ? full.replace(label, '').replace(/^[\s–—-]+/, '').trim() : full;
    return { label, text };
  }).filter((p) => p.label || p.text);

  const cta = meta(h, /<div class="main-heading-content">([\s\S]{0,3000}?)<\/div>\s*<\/div>/) || '';
  out.cta.title = T(meta(cta, /<h3>([\s\S]{0,250}?)<\/h3>/));
  out.cta.text = T(meta(cta, /<p>([\s\S]{0,600}?)<\/p>/));
  out.cta.links = [...cta.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)]
    .map((m) => ({ href: clean(m[1]), label: T(m[2]) })).filter((l) => l.label);

  for (const item of h.split('<div class="faq-item">').slice(1)) {
    const seg = item.slice(0, 9000);
    const q = T(meta(seg, /<div class="faq-question">([\s\S]{0,400}?)<span>/));
    const aRaw = meta(seg, /<div class="faq-answer">([\s\S]{0,7000}?)<\/div>\s*<\/div>/)
      || meta(seg, /<div class="faq-answer">([\s\S]{0,7000}?)<\/div>/);
    const answerHtml = tokenize(clean((aRaw || '').trim()), loc);
    if (q && answerHtml && !out.faqs.some((f) => f.question === q)) out.faqs.push({ question: q, answerHtml });
  }

  // fallback: older bootstrap-5 accordion FAQ markup
  if (!out.faqs.length) {
    for (const item of h.split('<div class="accordion-item">').slice(1)) {
      const seg = item.slice(0, 9000);
      const q = T(meta(seg, /<button class="accordion-button[^"]*"[^>]*>([\s\S]{0,400}?)<\/button>/));
      const aRaw = meta(seg, /<div class="accordion-body">([\s\S]{0,7000}?)<\/div>/);
      const answerHtml = tokenize(clean((aRaw || '').trim()), loc);
      if (q && answerHtml && !out.faqs.some((f) => f.question === q)) out.faqs.push({ question: q, answerHtml });
    }
  }

  const hs = [...h.matchAll(/<h([234])[^>]*>([\s\S]{0,300}?)<\/h\1>/g)];
  const SKIP = /^(Frequently Asked Questions.*|POPULAR SERVICES|USEFUL LINKS|Water Purifier in Popular Cities|RO Service in Popular Cities|Select a service|DF Promise|Quick Links)$/i;
  for (let i = 0; i < hs.length; i++) {
    const title = T(hs[i][2]);
    if (!title || SKIP.test(title) || title.length > 180) continue;
    const from = hs[i].index + hs[i][0].length;
    const to = Math.min(i + 1 < hs.length ? hs[i + 1].index : h.length, from + 5000);
    const seg = h.slice(from, to);
    const paragraphs = [...seg.matchAll(/<p[^>]*>([\s\S]{0,2500}?)<\/p>/g)].map((m) => T(m[1])).filter((t) => t.length > 45);
    const bullets = [...seg.matchAll(/<li[^>]*>([\s\S]{0,800}?)<\/li>/g)].map((m) => T(m[1])).filter((t) => t.length > 20 && t.length < 400);
    if (!paragraphs.length && !bullets.length) continue;
    if (out.faqs.some((f) => f.question === title)) continue;
    if (out.packages.some((p) => p.groupTitle === title)) continue;
    if (out.contentSections.some((s) => s.title === title)) continue;
    out.contentSections.push({ title, paragraphs: paragraphs.slice(0, 8), bullets: bullets.slice(0, 12) });
  }
  out.contentSections = out.contentSections.slice(0, 12);
  return out;
}

const templates = {
  'ro-service': { file: 'pages/ro-service-city.html', loc: 'bahadurgarh', prefix: 'ro-service' },
  'water-purifier': { file: 'pages/wp-city.html', loc: 'Mumbai', prefix: 'water-purifier' },
  'ro-plant': { file: 'pages/ro-plant-city.html', loc: 'Hyderabad', prefix: 'ro-plant' },
  'water-softener': { file: 'pages/softener-city.html', loc: 'Tohana', prefix: 'water-softener' },
  'water-ionizer': { file: 'pages/ionizer-city.html', loc: 'Tohana', prefix: 'water-ionizer' },
  'water-cooled-chiller': { file: 'pages/chiller-city.html', loc: 'Tohana', prefix: 'water-cooled-chiller' },
  'water-atm-machine-manufacturers': { file: 'pages/atm-city.html', loc: 'Tohana', prefix: 'water-atm-machine-manufacturers' },
  'dm-plant-manufacturers': { file: 'pages/dm-city.html', loc: 'Mumbai', prefix: 'dm-plant-manufacturers' },
  'effluent-treatment-plant-manufacturers': { file: 'pages/etp-city.html', loc: 'Mumbai', prefix: 'effluent-treatment-plant-manufacturers' },
  'sewage-treatment-plant-manufacturers': { file: 'pages/stp-city.html', loc: 'Mumbai', prefix: 'sewage-treatment-plant-manufacturers' },
};

const result = { templates: {}, pages: {} };

for (const [key, cfg] of Object.entries(templates)) {
  if (!fs.existsSync(cfg.file)) { console.error('missing', cfg.file); continue; }
  const t = { key, prefix: cfg.prefix, ...extract(cfg.file, cfg.loc) };
  result.templates[key] = t;
  console.log(key, '| pkgs', t.packages.length, '| faqs', t.faqs.length, '| sections', t.contentSections.length, '| why', t.whyChoose.points.length);
}

const fixed = {
  'water-purifier-service': 'pages/wp-service.html',
  'water-purifier-installation': 'pages/wp-install.html',
  'water-purifier-amc': 'pages/wp-amc.html',
};
for (const [slug, file] of Object.entries(fixed)) {
  const p = { slug, ...extract(file, 'India') };
  result.pages[slug] = p;
  console.log(slug, '| pkgs', p.packages.length, '| faqs', p.faqs.length, '| sections', p.contentSections.length);
}

fs.writeFileSync('services.json', JSON.stringify(result, null, 2));
console.log('written services.json');

const fs = require('fs');

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#8377;/g, '₹').replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '-').replace(/&copy;/g, '©')
  .replace(/&hellip;/g, '...').replace(/\s+/g, ' ').trim();
const clean = (s) => (s || '').replace(/https?:\/\/(www\.)?doctorfresh\.in/gi, '').trim();
const meta = (h, re) => { const m = h.match(re); return m ? m[1] : ''; };
const load = (p) => fs.readFileSync(p, 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

const home = load('pages/home.html');
const out = {};

/* ---------------- brand / contact ---------------- */
out.brand = {
  name: 'Doctor Fresh',
  tagline: strip(meta(home, /<meta name="description" content="([^"]*)"/)),
  homeTitle: strip(meta(home, /<title>([\s\S]*?)<\/title>/)),
  logo: '/images/logo-trimmed.png', // brand mark, whitespace cropped by trim-logo.js
  favicon: '/uploads/others/favicon.png',
  phone: '+91-9311587716',
  phoneRaw: '9311587716',
  whatsapp: 'https://wa.me/9311587716',
  email: 'info@doctorfresh.in',
  website: 'www.doctorfresh.in',
  currency: 'Indian Rupees (₹)',
  language: 'English India',
  about: strip(meta(home, /<div class="widget footer-logo-hide">[\s\S]{0,900}?<p><p>([\s\S]{0,900}?)<\/p>/)),
  offices: [
    { label: 'Head Office', address: 'Unit No. 830, 8th Floor, JMD Megapolis, Sohna Rd, Sector 48, Gurugram, Haryana 122018' },
    { label: 'Branch Office', address: 'Shop No. 03 Tower C, Omaxe Green Meadow city, Bhiwadi, Khairthal - Tijara (Raj)' },
  ],
  social: [...home.matchAll(/<a href="(https:\/\/(?:www\.)?(?:facebook|twitter|linkedin|instagram|youtube)[^"]*)"[^>]*class="([a-z]+) social_a"/g)]
    .map((m) => ({ href: m[1], key: m[2] })),
};

/* ---------------- hero slides ---------------- */
out.heroSlides = [...new Set([...home.matchAll(/data-src="(https:\/\/www\.doctorfresh\.in\/uploads\/slides_image\/[^"]+)"/g)]
  .map((m) => clean(m[1])))].map((src, i) => ({ src, alt: `Doctor Fresh offer ${i + 1}` }));

/* ---------------- today's deal ---------------- */
// The block holds one .thumbnail per deal; a lazy </div></div></div> match ends
// after the first one, so slice to the end of the enclosing <section> instead.
const dealStart = home.indexOf('class="todays_deal"');
const dealBlock = dealStart < 0 ? '' : home.slice(dealStart, home.indexOf('</section>', dealStart));
out.todaysDeal = [...new Set([...dealBlock.matchAll(/\/product\/[^"]*?\/(\d+)"/g)].map((m) => Number(m[1])))];

/* ---------------- trust badges ---------------- */
const badgeBlock = meta(home, /<div class="sub-cateroys">([\s\S]{0,4000}?)<\/div>\s*<\/div>\s*<\/section>/) || '';
out.trustBadges = [...badgeBlock.matchAll(/<img src="([^"]+)">\s*<h3>([\s\S]{0,120}?)<\/h3>/g)]
  .map((m) => ({ icon: clean(m[1]), title: strip(m[2]) }));

/* ---------------- water quality test ---------------- */
const wqBlock = home.slice(home.indexOf('Free water quality test'), home.indexOf('Free water quality test') + 9000);
out.waterTest = {
  title: 'Free water quality test by Doctor Fresh Water Analyst',
  parameters: [...wqBlock.matchAll(/<img src="([^"]+)">\s*<div class="tow">\s*<h2>([\s\S]{0,60}?)<\/h2>/g)]
    .map((m) => ({ icon: clean(m[1]), label: strip(m[2]) })),
  formTitle: strip(meta(wqBlock, /<h2>(Book Free Water Test)<\/h2>/)) || 'Book Free Water Test',
  enquiryType: 'Book Free Water Test',
  fields: [...wqBlock.matchAll(/<input type="(text|email|number)" name="([a-z_]+)"[^>]*placeholder="([^"]*)"/g)]
    .map((m) => ({ type: m[1], name: m[2], placeholder: m[3], required: true })),
};

/* ---------------- shop by categories (with icons) ---------------- */
const shopStart = home.indexOf('Shop By');
const shopBlock = home.slice(shopStart, home.indexOf('Featured Products', shopStart));
out.categoryTiles = [...shopBlock.matchAll(/<a href="https:\/\/www\.doctorfresh\.in(\/category\/[^"]+|\/spare-parts)">\s*<div class="first">\s*<img src="([^"]+)">\s*<h3>([\s\S]{0,120}?)<\/h3>/g)]
  .map((m) => ({ href: m[1], icon: clean(m[2]), label: strip(m[3]) }));

/* ---------------- homepage product rails ---------------- */
const sectionHeads = [...home.matchAll(/<h2[^>]*class="section-title[^"]*"[^>]*>([\s\S]{0,400}?)<\/h2>/g)].map((m) => ({
  index: m.index,
  end: m.index + m[0].length,
  title: strip(m[1].replace(/--&gt;|-->/g, '')),
  href: clean(meta(m[1], /href="([^"]+)"/)),
}));
// plain <h2> rails that are not styled as section-title (Latest / Recently Viewed / Most Viewed)
for (const m of home.matchAll(/<h2[^>]*>\s*(Latest Products|Recently Viewed|Most Viewed)\s*<\/h2>/g)) {
  sectionHeads.push({ index: m.index, end: m.index + m[0].length, title: strip(m[1]), href: '' });
}
sectionHeads.sort((a, b) => a.index - b.index);

const RAILS = {
  'Featured Products': 'Featured Products',
  'Buy Water Purifier Products': 'Water Purifier',
  'Ro Plant Products': 'RO Plant',
  'Water Softener Products': 'Water Softener',
  'Water Ionizer Products': 'Water Ionizer',
  'Latest Products': 'Latest Products',
  'Recently Viewed': 'Recently Viewed',
  'Most Viewed': 'Most Viewed',
};
out.rails = [];
for (let i = 0; i < sectionHeads.length; i++) {
  const sh = sectionHeads[i];
  if (!RAILS[sh.title]) continue;
  const to = i + 1 < sectionHeads.length ? sectionHeads[i + 1].index : home.length;
  const seg = home.slice(sh.end, to);
  const productIds = [...new Set([...seg.matchAll(/\/product\/[^"]*?\/(\d+)"/g)].map((m) => Number(m[1])))];
  if (productIds.length) out.rails.push({ title: RAILS[sh.title], href: sh.href && sh.href !== '/' ? sh.href : undefined, productIds });
}

/* ---------------- footer ---------------- */
const footer = home.slice(home.indexOf('<footer'));
function widgetLinks(title) {
  const s = footer.indexOf(`>${title}</h4>`);
  if (s < 0) return [];
  const seg = footer.slice(s, s + 4000);
  const ul = meta(seg, /<ul>([\s\S]{0,3500}?)<\/ul>/) || '';
  return [...ul.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)]
    .map((m) => ({ href: clean(m[1]), label: strip(m[2]) })).filter((l) => l.label);
}
out.footer = {
  categories: widgetLinks('Categories'),
  usefulLinks: widgetLinks('Useful Links'),
  legal: [...(meta(footer, /<div class="copyright">([\s\S]{0,3000}?)<\/div>/) || '')
    .matchAll(/<a href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)]
    .map((m) => ({ href: clean(m[1]), label: strip(m[2]) })),
  copyright: 'All Rights Reserved @ Doctor Fresh',
  newsletterAction: '/home/subscribe',
};

/* ---------------- header nav (top-level) ---------------- */
out.headerNav = [
  { label: 'Products', href: '/all-category' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Contact', href: '/contact' },
];
out.topBar = {
  phone: '+91-9311587716',
  email: 'info@doctorfresh.in',
  whatsapp: '9311587716',
};

/* ---------------- popular cities / services (from service pages) ---------------- */
const svc = load('pages/wp-service.html');
// Each footer column is `<h3>TITLE</h3><div class="footer-section">…links…</div>`.
// Bounding the match to that one div keeps columns from bleeding into each other.
function linkListAfter(h, heading) {
  const s = h.indexOf(`<h3>${heading}`);
  if (s < 0) return [];
  const start = h.indexOf('<div class="footer-section">', s);
  if (start < 0) return [];
  const end = h.indexOf('</div>', start);
  const seg = h.slice(start, end < 0 ? start + 8000 : end);
  return [...seg.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)]
    .map((m) => ({ href: clean(m[1]).replace(/\s+$/, ''), label: strip(m[2]) }))
    .filter((l) => l.label && l.href.startsWith('/'))
    .slice(0, 40);
}
out.popularServices = linkListAfter(svc, 'POPULAR SERVICES');
out.popularRoServiceCities = linkListAfter(svc, 'RO Service in Popular Cities');
out.popularWaterPurifierCities = linkListAfter(svc, 'Water Purifier in Popular Cities');
out.serviceUsefulLinks = linkListAfter(svc, 'USEFUL LINKS');

/* ---------------- forms (contact / partner / demo) ---------------- */
function formFields(h, formIdx) {
  const seg = h.slice(formIdx, formIdx + 14000);
  const fields = [];
  for (const m of seg.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const a = m[2];
    const name = meta(a, /name="([^"]+)"/);
    const type = meta(a, /type="([^"]+)"/) || (m[1] === 'select' ? 'select' : m[1]);
    if (!name || name === 'csrf_test_name' || type === 'hidden') continue;
    const f = { tag: m[1], type, name, placeholder: meta(a, /placeholder="([^"]*)"/), required: /required/.test(a) };
    if (m[1] === 'select') {
      const after = seg.slice(m.index, seg.indexOf('</select>', m.index) + 9);
      f.options = [...after.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]{0,120}?)<\/option>/g)]
        .map((o) => ({ value: o[1], label: strip(o[2]) })).filter((o) => o.label);
    }
    if (m[1] === 'input' && (type === 'radio' || type === 'checkbox')) f.value = meta(a, /value="([^"]*)"/);
    if (!fields.some((x) => x.name === f.name && x.value === f.value)) fields.push(f);
  }
  return fields;
}

const contact = load('pages/contact.html');
const cIdx = contact.indexOf('Contact Form');
out.contactPage = {
  metaTitle: strip(meta(contact, /<title>([\s\S]*?)<\/title>/)),
  metaDescription: strip(meta(contact, /<meta name="description" content="([^"]*)"/)),
  formTitle: 'Contact Form',
  fields: formFields(contact, cIdx).filter((f) => ['name', 'email', 'mobile', 'message'].includes(f.name)),
  otherInfoTitle: 'Other Contact Information',
};

const partner = load('pages/partner2.html');
const pIdx = partner.indexOf('Become A Dealer');
out.partnerPage = {
  metaTitle: strip(meta(partner, /<title>([\s\S]*?)<\/title>/)),
  metaDescription: strip(meta(partner, /<meta name="description" content="([^"]*)"/)),
  heading: 'Become A Partner',
  tabs: [...partner.matchAll(/<h3>(Become A [^<]+)<\/h3>/g)].map((m) => strip(m[1])),
  fields: formFields(partner, pIdx).filter((f) => !['query', 'category', 'type', 'submit'].includes(f.name)),
};

// site-wide demo booking form
const demoIdx = contact.indexOf('Book Water Purifier Demo');
out.demoForm = {
  title: 'Book Water Purifier Demo',
  fields: formFields(contact, demoIdx).filter((f) => f.name !== 'submit'),
};

/* ---------------- store locator ---------------- */
const storeHtml = load('pages/store-locator.html');
out.stores = [];
for (const li of storeHtml.split('<li>').slice(1)) {
  const seg = li.slice(0, 1200);
  const city = strip(meta(seg, /<p class="table-title">([\s\S]{0,120}?)<\/p>/));
  const address = strip(meta(seg, /<span class="address J_address">([\s\S]{0,400}?)<\/span>/));
  const hours = strip(meta(seg, /<span>Hours:<\/span><span>([\s\S]{0,120}?)<\/span>/));
  if (city && address) out.stores.push({ city, address, hours: hours || '09:00AM - 06:00PM, Monday to Sunday' });
}

/* ---------------- careers ---------------- */
const careersHtml = load('pages/careers.html');
out.careers = {
  title: strip(meta(careersHtml, /<h2 class="section-title section-title-lg">\s*<span>([\s\S]{0,120}?)<\/span>/)) || 'Opportunities',
  intro: strip(meta(careersHtml, /<div class="career_txt">([\s\S]{0,800}?)<\/div>/)),
};

/* ---------------- legal pages ---------------- */
out.legal = {};
for (const f of fs.readdirSync('legal')) {
  const slug = f.replace(/\.html$/, '');
  const h = load('legal/' + f);
  const title = strip(meta(h, /<title>([\s\S]*?)<\/title>/));
  let body = meta(h, /<div class="content-area"[^>]*>([\s\S]*?)<\/div>\s*<footer/);
  if (!body) body = meta(h, /<section class="page-section[^"]*">([\s\S]*?)<\/section>/);
  const sections = [];
  const hs = [...(body || '').matchAll(/<h([1-4])[^>]*>([\s\S]{0,250}?)<\/h\1>/g)];
  for (let i = 0; i < hs.length; i++) {
    const t = strip(hs[i][2]);
    if (!t || /^(Categories|Useful Links|Contact Us|Subtotal)$/i.test(t)) continue;
    const from = hs[i].index + hs[i][0].length;
    const to = Math.min(i + 1 < hs.length ? hs[i + 1].index : body.length, from + 6000);
    const seg = body.slice(from, to);
    const paragraphs = [...seg.matchAll(/<p[^>]*>([\s\S]{0,3000}?)<\/p>/g)].map((m) => strip(m[1])).filter((x) => x.length > 25);
    const bullets = [...seg.matchAll(/<li[^>]*>([\s\S]{0,800}?)<\/li>/g)].map((m) => strip(m[1])).filter((x) => x.length > 15 && x.length < 500);
    if (!paragraphs.length && !bullets.length) continue;
    sections.push({ title: t, paragraphs: paragraphs.slice(0, 20), bullets: bullets.slice(0, 20) });
  }
  out.legal[slug] = { slug, title, heading: sections[0] ? sections[0].title : title, sections: sections.slice(0, 25) };
}

fs.writeFileSync('site.json', JSON.stringify(out, null, 2));
console.log('slides', out.heroSlides.length, '| badges', out.trustBadges.length, '| tiles', out.categoryTiles.length,
  '| rails', out.rails.length, '| wq params', out.waterTest.parameters.length,
  '| footer cats', out.footer.categories.length, '| useful', out.footer.usefulLinks.length,
  '| legal', Object.keys(out.legal).length, '| partner fields', out.partnerPage.fields.length,
  '| contact fields', out.contactPage.fields.length, '| demo fields', out.demoForm.fields.length,
  '| popCities', out.popularRoServiceCities.length, '| popServices', out.popularServices.length);

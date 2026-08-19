const fs = require('fs');
const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
  .replace(/&ndash;/g, '-').replace(/&hellip;/g, '...').replace(/\s+/g, ' ').trim();
const clean = (s) => (s || '').replace(/https?:\/\/www\.doctorfresh\.in/g, '').trim();
const meta = (h, re) => { const m = h.match(re); return m ? m[1] : ''; };
const load = (p) => fs.readFileSync(p, 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

const urls = fs.readFileSync('blog-urls.txt', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const slugById = {};
for (const u of urls) { const m = u.match(/\/blog\/(\d+)\/(.+)$/); if (m) slugById[m[1]] = m[2]; }

// category map: which posts belong to which blog category
const catSlugs = ['water-purifier', 'water-softener', 'health', 'waterborne-disease', 'how-to', 'ro-plant', 'ro-services'];
const catName = {};
const postCats = {};
for (const c of catSlugs) {
  const f = `blog/cat-${c}.html`;
  if (!fs.existsSync(f)) continue;
  const h = load(f);
  catName[c] = strip(meta(h, /<title>([\s\S]*?)<\/title>/)).split('|')[0].trim() || c;
  for (const m of h.matchAll(/href="https:\/\/www\.doctorfresh\.in\/blog\/(\d+)\//g)) {
    (postCats[m[1]] = postCats[m[1]] || []).push(c);
  }
}

const posts = [];
for (const id of Object.keys(slugById).sort((a, b) => a - b)) {
  const f = `blog/${id}.html`;
  if (!fs.existsSync(f)) continue;
  const h = load(f);
  const title = strip(meta(h, /<h1 class="post-title">([\s\S]{0,400}?)<\/h1>/));
  if (!title) { console.error('skip', id); continue; }
  const metaLine = strip(meta(h, /<div class="post-meta">([\s\S]{0,300}?)<\/div>/));
  const dm = metaLine.match(/(\d{4}-\d{2}-\d{2})/);
  const author = metaLine.replace(/By\s*/i, '').split('/')[0].trim() || 'Doctor Fresh';
  let body = meta(h, /<div class="post-excerpt">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/);
  if (!body) body = meta(h, /<div class="post-excerpt">([\s\S]*?)<div class="post-footer/);
  if (!body) body = meta(h, /<div class="post-body">([\s\S]*?)<\/article>/);
  body = clean((body || '').trim());
  const plain = strip(body);
  posts.push({
    id: Number(id),
    slug: slugById[id],
    url: `/blog/${id}/${slugById[id]}`,
    title,
    metaTitle: strip(meta(h, /<title>([\s\S]*?)<\/title>/)),
    metaDescription: strip(meta(h, /<meta name="description" content="([^"]*)"/)),
    image: `https://www.doctorfresh.in/uploads/blog_image/blog_${id}.jpg`,
    author,
    date: dm ? dm[1] : '',
    categories: [...new Set(postCats[id] || [])],
    excerpt: plain.slice(0, 200).replace(/\s+\S*$/, '') + (plain.length > 200 ? '...' : ''),
    readingMinutes: Math.max(2, Math.round(plain.split(/\s+/).length / 200)),
    contentHtml: body,
  });
}

const categories = catSlugs.map((c) => ({
  slug: c,
  name: { 'water-purifier': 'Water Purifier', 'water-softener': 'Water Softener', health: 'Health',
    'waterborne-disease': 'Waterborne Disease', 'how-to': 'How To', 'ro-plant': 'RO Plant',
    'ro-services': 'RO Services' }[c],
  href: `/blogs/${c}`,
}));

fs.writeFileSync('blogs.json', JSON.stringify({ posts, categories }, null, 2));
console.log('posts', posts.length, 'withBody', posts.filter((p) => p.contentHtml.length > 500).length,
  'withDate', posts.filter((p) => p.date).length, 'categorised', posts.filter((p) => p.categories.length).length);

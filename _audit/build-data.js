const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data');
fs.mkdirSync(OUT, { recursive: true });

const header = (what) =>
  `// ${what}\n// Extracted from the live DoctorFresh website (www.doctorfresh.in).\n` +
  `// Shape mirrors the existing SQL records so this file can be swapped for a real API/DB call\n` +
  `// without touching any UI component.\n\n`;

const write = (file, what, body) => {
  fs.writeFileSync(path.join(OUT, file), header(what) + body);
  console.log(file, (fs.statSync(path.join(OUT, file)).size / 1024).toFixed(1) + 'kb');
};

const j = (v) => JSON.stringify(v, null, 2);

/* ---------------- products ---------------- */
const products = require('./products.json');
write('products.js', 'Product catalogue', `export const products = ${j(products)};\n\nexport default products;\n`);

/* ---------------- categories ---------------- */
const categories = require('./categories.json');
write('categories.js', 'Category / subcategory tree', `export const categories = ${j(categories)};\n\nexport default categories;\n`);

/* ---------------- blogs ---------------- */
const blogs = require('./blogs.json');
write('blogs.js', 'Blog posts and blog categories',
  `export const blogCategories = ${j(blogs.categories)};\n\nexport const blogPosts = ${j(blogs.posts)};\n\nexport default blogPosts;\n`);

/* ---------------- services ---------------- */
const services = require('./services.json');
write('services.js', 'Service page content + location page templates',
  `export const serviceTemplates = ${j(services.templates)};\n\nexport const servicePages = ${j(services.pages)};\n\n` +
  `export const serviceTemplateKeys = ${j(Object.keys(services.templates))};\n\nexport default serviceTemplates;\n`);

/* ---------------- site ---------------- */
const site = require('./site.json');
write('site.js', 'Global site content: brand, header, footer, homepage sections, forms, legal pages',
  Object.entries(site).map(([k, v]) => `export const ${k} = ${j(v)};\n`).join('\n') +
  `\nexport default { ${Object.keys(site).join(', ')} };\n`);

/* ---------------- locations ---------------- */
const locations = require('./locations.json');
const body = Object.entries(locations)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.join('|'))},`)
  .join('\n');
write('locations.js', 'Location slugs for every SEO location/service URL family',
  `// Slugs are stored pipe-joined to keep the module small; they are split once on first use.\n` +
  `const RAW = {\n${body}\n};\n\n` +
  `const cache = {};\n\n` +
  `export function getLocationSlugs(key) {\n` +
  `  if (!cache[key]) cache[key] = RAW[key] ? RAW[key].split('|') : [];\n` +
  `  return cache[key];\n` +
  `}\n\n` +
  `export function hasLocation(key, slug) {\n` +
  `  return getLocationSlugs(key).includes(slug);\n` +
  `}\n\n` +
  `export const locationFamilies = Object.keys(RAW);\n\n` +
  `export const locationCounts = ${j(Object.fromEntries(Object.entries(locations).map(([k, v]) => [k, v.length])))};\n`);

console.log('\nproducts', products.length, '| categories', categories.length, '| posts', blogs.posts.length);

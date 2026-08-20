/**
 * One-off styling sweep for the inner pages.
 *
 * Presentation only: it lifts the breadcrumb into the same muted band the
 * category pages use, opens up the page padding and puts every <h1> on the same
 * scale. No content, links, props or logic are touched.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'app/blogs/page.jsx',
  'app/blogs/[category]/page.jsx',
  'app/cart/page.jsx',
  'app/cart-checkout/page.jsx',
  'app/all-category/page.jsx',
  'app/contact/page.jsx',
  'app/partner/page.jsx',
  'app/spare-parts/page.jsx',
  'app/store-locator/page.jsx',
  'app/careers/page.jsx',
  'app/compare/page.jsx',
  'app/search/page.jsx',
  'app/legal/[slug]/page.jsx',
];

const OPEN = '    <div className="df-container py-6 md:py-8">';

let changed = 0;

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  const crumb = s.match(/ {6}<Breadcrumb items=\{[\s\S]*?\} \/>\n/);
  if (s.includes(OPEN) && crumb) {
    const band =
      '    <>\n' +
      '      <div className="border-b border-line bg-surface-muted">\n' +
      '        <div className="df-container py-4">\n' +
      crumb[0].replace(/^ {6}/gm, '          ') +
      '        </div>\n' +
      '      </div>\n\n' +
      '      <div className="df-container py-8 md:py-10">\n';

    s = s.replace(OPEN + '\n' + crumb[0], band);

    // close the extra fragment at the end of the component
    s = s.replace(/ {4}<\/div>\n {2}\);\n}\n?$/, '      </div>\n    </>\n  );\n}\n');
  }

  // one shared heading scale
  s = s.split('text-2xl font-semibold text-ink-900 md:text-[30px]')
    .join('text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]');

  if (s !== before) {
    fs.writeFileSync(file, s);
    changed++;
    console.log('updated', rel);
  } else {
    console.error('unchanged', rel);
  }
}

console.log('\nfiles changed:', changed, '/', FILES.length);

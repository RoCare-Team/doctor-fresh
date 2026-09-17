// Redirect rules: the parts shared by the admin screen (in the browser) and the
// middleware and API (on the server). Nothing here touches the database.

export const REDIRECT_TYPES = [
  { code: 301, label: '301 – Permanent Redirect', short: '301', needsDestination: true },
  { code: 302, label: '302 – Temporary Redirect', short: '302', needsDestination: true },
  { code: 404, label: '404 – Not Found', short: '404', needsDestination: false },
  { code: 410, label: '410 – Gone (Deindex)', short: '410', needsDestination: false },
];

/** Which part of the site a rule belongs to, by the URL prefix it lives under. */
export const COLLECTIONS = [
  { id: 'pages', label: 'Pages', prefix: '', display: '[slug]' },
  { id: 'product', label: 'Product', prefix: '/product', display: '/product/' },
  { id: 'blog', label: 'Blog', prefix: '/blog', display: '/blog/' },
  { id: 'category', label: 'Category', prefix: '/category', display: '/category/' },
];

export const SITE_HOST = 'www.doctorfresh.in';
const OWN_HOST = /(^|\.)doctorfresh\.in$/i;
const PAGE_EXTENSION = /\.(php|html?|aspx?|jsp)$/i;

export const typeInfo = (code) => REDIRECT_TYPES.find((t) => t.code === Number(code));

/**
 * Any way a person might paste an old address — a full URL, a domain and
 * path, a bare slug, "page.php", a trailing slash, a query string — reduced to
 * the one form a request path is matched against: lower case, leading slash,
 * no extension, no trailing slash.
 */
export function cleanPath(input) {
  let s = String(input ?? '').trim();
  if (!s) return '';

  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  // "www.site.com/page" — the first segment is a host, not part of the path.
  if (!s.startsWith('/')) {
    const first = s.split('/')[0];
    if (first.includes('.') && !PAGE_EXTENSION.test(first)) s = s.slice(first.length);
  }

  s = s.split(/[?#]/)[0];
  try {
    s = decodeURI(s);
  } catch { /* a malformed escape is matched as typed */ }

  s = `/${s.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
  s = s.replace(PAGE_EXTENSION, '').replace(/\/+$/, '');
  return (s || '/').toLowerCase();
}

/** The collection a cleaned path falls under. */
export function collectionOf(path) {
  const match = COLLECTIONS.find((c) => c.prefix && (path === c.prefix || path.startsWith(`${c.prefix}/`)));
  return match ? match.id : 'pages';
}

/**
 * The stored source for what was typed in a collection: "life-veda" typed on
 * the Product tab means /product/life-veda, while a path that already carries
 * a prefix is kept as it is and filed under that prefix's collection.
 */
export function sourceFor(input, collectionId) {
  const path = cleanPath(input);
  if (!path || path === '/') return { source: '', collection: collectionId };

  const typedCollection = collectionOf(path);
  if (typedCollection !== 'pages') return { source: path, collection: typedCollection };

  const c = COLLECTIONS.find((x) => x.id === collectionId);
  if (c?.prefix) return { source: `${c.prefix}${path}`, collection: c.id };
  return { source: path, collection: 'pages' };
}

/**
 * Where a redirect sends people. An address on this site is kept as a path
 * (so it follows the site to any domain it is served from); another site's
 * address is kept whole.
 */
export function cleanDestination(input) {
  let s = String(input ?? '').trim();
  if (!s) return '';

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s)) {
    s = `https://${s}`;
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      if (OWN_HOST.test(url.hostname)) {
        return `${url.pathname.replace(/\/+$/, '') || '/'}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  return `/${s.replace(/^\/+/, '')}`;
}

/** Checks one rule the same way in the form and on the server. Returns an error or ''. */
export function validateRule({ source, destination, type }) {
  const info = typeInfo(type);
  if (!info) return 'Choose a redirect type.';
  if (!source || source === '/') return 'Enter the old address to redirect.';
  if (source.length > 500) return 'The source address is too long.';
  if (info.needsDestination) {
    if (!destination) return 'Enter where this address should go.';
    if (destination.length > 1000) return 'The destination address is too long.';
    if (!/^https?:\/\//i.test(destination) && cleanPath(destination) === source) {
      return 'The destination is the same page — that would loop forever.';
    }
  }
  return '';
}

/**
 * Reads a pasted or uploaded list: one rule per line, "source, destination,
 * type" or "source, type" for 404/410, commas or tabs. A header row is skipped.
 */
export function parseImport(text, collectionId) {
  const rows = [];
  const errors = [];

  String(text || '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;

    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (index === 0 && /source|from|old/i.test(cells[0])) return;

    // Columns keep their places — an empty source must not let the
    // destination slide into its slot.
    const codeAt = cells.findIndex((c, i) => i > 0 && /^\d{3}$/.test(c));
    if (codeAt > 0 && !typeInfo(cells[codeAt])) {
      errors.push(`Line ${index + 1}: ${cells[codeAt]} is not a redirect type (use 301, 302, 404 or 410).`);
      return;
    }
    const type = codeAt > 0 ? Number(cells[codeAt]) : 301;
    const { source, collection } = sourceFor(cells[0], collectionId);
    const destinationCell = codeAt === 1 ? '' : cells[1];
    const destination = typeInfo(type)?.needsDestination ? cleanDestination(destinationCell) : '';

    const problem = validateRule({ source, destination, type });
    if (problem) errors.push(`Line ${index + 1}: ${problem}`);
    else rows.push({ source, destination, type, collection });
  });

  return { rows, errors };
}

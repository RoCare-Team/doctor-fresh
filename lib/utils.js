export const SITE_URL = 'https://www.doctorfresh.in';

/**
 * Search-engine visibility switch.
 *
 * Off by default so staging and preview builds can never be indexed. Set
 * NEXT_PUBLIC_SITE_INDEXABLE=true in the production environment to turn
 * indexing back on — nothing else needs to change.
 */
export const SITE_INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true';

const NOINDEX = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

/** The live site serves images from its own /uploads directory. */
export function imageUrl(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

export function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** Replace the {location} token used by the location page templates. */
export function fill(text, location) {
  if (!text) return '';
  return text.split('{location}').join(location || '');
}

export function fillDeep(value, location) {
  if (typeof value === 'string') return fill(value, location);
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, location));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillDeep(v, location);
    return out;
  }
  return value;
}

export function metaFor({ title, description, path, image, robots }) {
  const url = `${SITE_URL}${path || ''}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // a page's own robots value still applies, but only while the site is
    // allowed to be indexed at all
    robots: SITE_INDEXABLE ? robots || { index: true, follow: true } : NOINDEX,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Doctor Fresh',
      type: 'website',
      images: image ? [{ url: imageUrl(image) }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@DoctorFreshIN',
      title,
      description,
      images: image ? [imageUrl(image)] : undefined,
    },
  };
}

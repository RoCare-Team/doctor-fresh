export const SITE_URL = 'https://www.doctorfresh.in';

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
    robots: robots || { index: true, follow: true },
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

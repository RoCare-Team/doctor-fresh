// Resolves catalogue images against the files that actually ship in
// /public/uploads.
//
// The database only records how many images a product has (`num_of_imgs`), not
// their names, and the admin panel's numbering is not always 1-based — some
// products start at `product_<id>_2.jpg`, a few are .png, and two blog posts
// have no image file at all. Guessing the filename therefore produces broken
// images, so the upload directories are indexed once and the real names are
// used. If a directory is missing (a deploy that serves media from a CDN), the
// conventional name is generated instead and nothing breaks.

import fs from 'node:fs';
import path from 'node:path';

import { UPLOADS_BASE, UPLOAD_DIRS } from './schema';

const SERVE_LOCALLY = UPLOADS_BASE.startsWith('/');
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const globalForMedia = globalThis;

/**
 * dir → Map<id, filename[]>, built from one readdir per directory.
 * Thumbnails are skipped; the UI always renders the full-size file.
 */
function index(dir, pattern) {
  globalForMedia.__dfMedia ??= new Map();
  if (globalForMedia.__dfMedia.has(dir)) return globalForMedia.__dfMedia.get(dir);

  const byId = new Map();

  if (SERVE_LOCALLY) {
    const abs = path.join(process.cwd(), 'public', UPLOADS_BASE.replace(/^\//, ''), dir);
    let files = [];
    try {
      files = fs.readdirSync(abs);
    } catch {
      // No local directory — callers fall back to the conventional name.
    }

    for (const file of files) {
      if (!IMAGE_EXT.test(file) || /_thumb\./i.test(file)) continue;
      const m = file.match(pattern);
      if (!m) continue;
      const id = Number(m[1]);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(file);
    }

    // `product_9_10.jpg` must sort after `product_9_2.jpg`.
    for (const list of byId.values()) {
      list.sort((a, b) => {
        const n = (s) => Number((s.match(/_(\d+)\.[a-z]+$/i) || [])[1] ?? 0);
        return n(a) - n(b) || a.localeCompare(b);
      });
    }
  }

  globalForMedia.__dfMedia.set(dir, byId);
  return byId;
}

const url = (dir, file) => `${UPLOADS_BASE}/${dir}/${file}`;

/** Every photo a product has, in the order the gallery should show them. */
export function productImages(id, declaredCount) {
  const dir = UPLOAD_DIRS.product;
  const found = index(dir, /^product_(\d+)_\d+\.[a-z]+$/i).get(Number(id));

  if (found?.length) return found.map((f) => url(dir, f));

  const total = Math.max(1, Number(declaredCount) || 1);
  return Array.from({ length: total }, (_, i) => url(dir, `product_${id}_${i + 1}.jpg`));
}

/** A post's hero image, or null when no file was ever uploaded for it. */
export function blogImage(id) {
  const dir = UPLOAD_DIRS.blog;
  const byId = index(dir, /^blog_(\d+)\.[a-z]+$/i);
  const found = byId.get(Number(id));

  if (found?.length) return url(dir, found[0]);
  // Only assume a name when there is no local directory to check against.
  return byId.size ? null : url(dir, `blog_${id}.jpg`);
}

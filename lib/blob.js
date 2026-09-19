// Uploaded files in Vercel Blob.
//
// On Vercel the app cannot write into its own `public/` folder — a file saved
// there at runtime is never served and vanishes with the instance. So when
// BLOB_READ_WRITE_TOKEN is set, every admin upload (product photos, blog
// covers, editor images) goes to Blob instead, under the same folder and file
// names the site already uses:
//
//   uploads/product_image/product_<id>_<n>-<random>.webp
//   uploads/blog_image/blog_<id>-<random>.webp
//   uploads/editor/<time>-<random>.<ext>
//
// The random suffix gives every upload a new address, so a replaced photo is
// never served stale from a cache. Photos that came with the site (the files
// in public/uploads) keep working; once a product's photos are changed in the
// admin, its set lives in Blob and Blob wins.

import {
  put, del, list, copy,
} from '@vercel/blob';

/**
 * The store's token. Vercel names it BLOB_READ_WRITE_TOKEN — or, for a store
 * connected with a custom prefix, <PREFIX>_READ_WRITE_TOKEN (for example
 * BLOB_READ_WRITE_TOKEN1_READ_WRITE_TOKEN) — so either is accepted.
 */
function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const found = Object.entries(process.env)
    .find(([key, value]) => /READ_WRITE_TOKEN$/.test(key) && String(value).startsWith('vercel_blob_rw_'));
  return found ? found[1] : '';
}

export const blobEnabled = () => Boolean(blobToken());

const store = globalThis;
const TTL = 60_000;

export const PRODUCT_FILE = /^product_(\d+)_(\d+)(?:-[A-Za-z0-9]+)?\.[a-z0-9]+$/i;
export const BLOG_FILE = /^blog_(\d+)(?:-[A-Za-z0-9]+)?\.[a-z0-9]+$/i;
const baseName = (pathname) => pathname.split('/').pop();

/** Every blob under a prefix, following the pages of the listing. */
export async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await list({
      prefix, cursor, limit: 1000, token: blobToken(),
    });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

function buildIndex(blobs) {
  const product = new Map();
  const blog = new Map();
  for (const b of blobs) {
    const name = baseName(b.pathname);
    let m = name.match(PRODUCT_FILE);
    if (b.pathname.startsWith('uploads/product_image/') && m) {
      const id = Number(m[1]);
      if (!product.has(id)) product.set(id, []);
      product.get(id).push({ n: Number(m[2]), url: b.url, name, at: new Date(b.uploadedAt).getTime() });
      continue;
    }
    m = name.match(BLOG_FILE);
    if (b.pathname.startsWith('uploads/blog_image/') && m) {
      const id = Number(m[1]);
      const at = new Date(b.uploadedAt).getTime();
      // Only the newest cover counts, should an old one ever be left behind.
      if (!blog.has(id) || blog.get(id).at < at) blog.set(id, { url: b.url, name, at });
    }
  }
  for (const listForId of product.values()) listForId.sort((a, b) => a.n - b.n || b.at - a.at);
  return { product, blog };
}

/**
 * Loads (or refreshes) the Blob listing that productImages() and blogImage()
 * read synchronously. Awaited by the data loaders before they map rows, so
 * pages render with the uploaded photos. A no-op without a token.
 */
export async function warmMedia({ force = false } = {}) {
  if (!blobEnabled()) return;
  const hit = store.__dfBlobIndex;
  if (!force && hit && Date.now() - hit.at < TTL) return;
  if (store.__dfBlobLoading && !force) { await store.__dfBlobLoading; return; }

  store.__dfBlobLoading = (async () => {
    try {
      const blobs = await listAll('uploads/');
      store.__dfBlobIndex = { at: Date.now(), ...buildIndex(blobs) };
    } catch (err) {
      console.error('[blob] listing failed:', err.message);
      // Keep serving the last good listing rather than dropping every upload.
      if (hit) store.__dfBlobIndex = { ...hit, at: Date.now() - TTL + 10_000 };
    } finally {
      store.__dfBlobLoading = null;
    }
  })();
  await store.__dfBlobLoading;
}

/** The loaded listing, read synchronously by lib/sql/media.js. */
export const blobIndex = () => store.__dfBlobIndex || null;

export function forgetBlobIndex() {
  if (store.__dfBlobIndex) store.__dfBlobIndex.at = 0;
}

export async function putPublic(pathname, body, contentType) {
  return put(pathname, body, {
    token: blobToken(),
    access: 'public',
    addRandomSuffix: true,
    contentType,
    // Each upload has its own address, so it can be cached for a year.
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
}

export async function copyPublic(fromUrl, pathname) {
  return copy(fromUrl, pathname, { token: blobToken(), access: 'public', addRandomSuffix: true });
}

export async function removeBlobs(urls) {
  const list = [].concat(urls).filter(Boolean);
  if (list.length) await del(list, { token: blobToken() });
}

/** This product's photos in Blob, freshly listed (not from the cache). */
export async function productBlobs(id) {
  const blobs = await listAll(`uploads/product_image/product_${id}_`);
  return blobs
    .map((b) => {
      const name = baseName(b.pathname);
      const m = name.match(PRODUCT_FILE);
      return m && Number(m[1]) === Number(id)
        ? { n: Number(m[2]), url: b.url, name, size: b.size, at: new Date(b.uploadedAt).getTime() }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n || b.at - a.at);
}

/**
 * Turns a failed upload into a message an admin can act on, instead of a
 * bare 500. The usual cause on Vercel is the token not reaching the
 * deployment, which makes the code fall back to writing into public/.
 */
export function uploadFailure(err) {
  const code = err?.code || '';
  const message = String(err?.message || err || '');
  console.error('[upload] failed:', code, message);

  let error;
  if (['EROFS', 'EACCES', 'EPERM', 'ENOENT'].includes(code) && !blobEnabled()) {
    error = 'This server cannot save files to its own folder. Add the Vercel Blob token '
      + '(BLOB_READ_WRITE_TOKEN) to this project’s environment variables and redeploy.';
  } else if (/private store|private access/i.test(message)) {
    error = 'The Vercel Blob store is private. Connect a store created with Public access and redeploy.';
  } else if (/access denied|unauthori[sz]ed|token/i.test(message) && blobEnabled()) {
    error = `Vercel Blob refused the token (${message}). Check the token in the environment variables and redeploy.`;
  } else {
    error = `Upload failed: ${message || code || 'unknown error'}`;
  }
  return Response.json({ ok: false, error, storage: blobEnabled() ? 'blob' : 'local' }, { status: 500 });
}

/** Wraps a route handler so any thrown error comes back as uploadFailure(). */
export const withUploadErrors = (handler) => async (request) => {
  try {
    return await handler(request);
  } catch (err) {
    return uploadFailure(err);
  }
};

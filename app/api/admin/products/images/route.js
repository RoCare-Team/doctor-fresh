// Product photos.
//
// Named the way the whole site already reads them — product_<id>_<n> — and
// `num_of_imgs` is kept in step so the storefront and the PHP panel agree.
//
// Where they are stored:
//   • with BLOB_READ_WRITE_TOKEN (Vercel): in Vercel Blob. The photos that
//     came with the site stay exactly as they are; the first time a product's
//     photos are changed, its current set is copied into Blob beside them and
//     the change is made there, so nothing already showing is lost.
//   • without it (a normal server / local): in public/uploads/product_image.
//
// Every upload is converted to WebP on the way in: a phone photo of several
// megabytes becomes a few hundred kilobytes.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { revalidatePath } from 'next/cache';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { setImageCount } from '@/lib/sql/admin-catalog';
import { forgetMedia, productImages } from '@/lib/sql/media';
import { clearCache } from '@/lib/sql/cache';
import {
  blobEnabled, productBlobs, putPublic, copyPublic, removeBlobs, warmMedia, withUploadErrors,
} from '@/lib/blob';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'product_image');
const PUBLIC = '/uploads/product_image';
const MAX_BYTES = 10 * 1024 * 1024;
// Big enough for the zoom panel on the product page, small enough to load fast.
const MAX_EDGE = 1600;
const ACCEPTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff', 'image/heic', 'image/heif',
]);

// product_12_3.jpg and, in Blob, product_12_3-AbC123.webp
const numberOf = (file) => Number((String(file).match(/_(\d+)(?:-[A-Za-z0-9]+)?\.[a-z0-9]+$/i) || [])[1] || 0);
const idFrom = (value) => Number(value) || 0;
const ownName = (id, name) => new RegExp(`^product_${id}_\\d+(?:-[A-Za-z0-9]+)?\\.[a-z0-9]+$`, 'i').test(String(name || ''));
const blobPath = (id, n) => `uploads/product_image/product_${id}_${n}.webp`;

/* ------------------------------------------------------------ local files */

async function localFiles(id) {
  let files = [];
  try {
    files = await fs.readdir(DIR);
  } catch {
    return [];
  }
  const pattern = new RegExp(`^product_${id}_(\\d+)\\.[a-z]+$`, 'i');
  return files
    .filter((f) => pattern.test(f) && !/_thumb\./i.test(f))
    .sort((a, b) => numberOf(a) - numberOf(b));
}

/**
 * The photos a product shows today, before anything is in Blob: the files on
 * disk, or — on Vercel, where public/ cannot be read — the addresses the
 * storefront already uses for it.
 */
async function currentPhotos(id) {
  const files = await localFiles(id);
  if (files.length) return files.map((f) => ({ name: f, n: numberOf(f), src: `${PUBLIC}/${f}` }));
  return productImages(id, 1)
    .filter((src) => src.startsWith('/'))
    .map((src) => ({ name: src.split('/').pop(), n: numberOf(src), src }));
}

/* -------------------------------------------------------------- listings */

async function listing(id) {
  if (blobEnabled()) {
    const blobs = await productBlobs(id);
    if (blobs.length) {
      return blobs.map((b) => ({ name: b.name, src: b.url, preview: b.url, size: b.size }));
    }
    return (await currentPhotos(id)).map((p) => ({ name: p.name, src: p.src, preview: p.src, size: 0 }));
  }

  const files = await localFiles(id);
  const out = [];
  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    const stat = await fs.stat(path.join(DIR, f)).catch(() => null);
    out.push({
      name: f,
      src: `${PUBLIC}/${f}`,
      // Stamped so a replaced file is not shown stale from the browser cache.
      preview: `${PUBLIC}/${f}?v=${stat ? Math.round(stat.mtimeMs) : Date.now()}`,
      size: stat?.size || 0,
    });
  }
  return out;
}

/**
 * Before the first change in Blob: copy the product's existing photos there
 * (the originals are left untouched), so the set being edited is complete.
 */
async function blobSet(id, origin) {
  const already = await productBlobs(id);
  if (already.length) return already;

  for (const photo of await currentPhotos(id)) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(new URL(photo.src, origin)).catch(() => null);
    if (!res?.ok) continue; // a photo that never existed is simply not carried over
    const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase();
    // eslint-disable-next-line no-await-in-loop
    await putPublic(
      `uploads/product_image/product_${id}_${photo.n || 1}.${ext}`,
      Buffer.from(await res.arrayBuffer()),
      res.headers.get('content-type') || 'image/jpeg',
    );
  }
  return productBlobs(id);
}

async function afterChange(id, count) {
  forgetMedia();
  await warmMedia({ force: true }).catch(() => {});
  try {
    await setImageCount(id, count);
  } catch (err) {
    console.error('[admin] could not update the image count:', err.message);
  }
  // The storefront keeps the catalogue in memory and caches product pages,
  // listings and the home page; without this the old photo stays for minutes.
  clearCache();
  try {
    revalidatePath('/', 'layout');
  } catch { /* best-effort */ }
}

/** Checks one upload and returns it as a WebP buffer, or an error message. */
async function toWebp(file) {
  if (!file || typeof file !== 'object' || !file.size) return { error: 'Choose an image.' };
  if (!ACCEPTED.has(file.type)) {
    return { error: `${file.name}: only PNG, JPG, WebP, GIF, AVIF or HEIC images are accepted.` };
  }
  if (file.size > MAX_BYTES) return { error: `${file.name} is larger than 10 MB.` };

  try {
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), { animated: false })
      .rotate() // honour the phone's orientation flag before it is stripped
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer, original: file.size };
  } catch {
    return { error: `${file.name} could not be read as an image.` };
  }
}

const guard = (request) => requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');

/* ------------------------------------------------------------------ routes */

async function handleGET(request) {
  const { response } = await guard(request);
  if (response) return response;

  const id = idFrom(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown product.');

  return Response.json({ ok: true, images: await listing(id), storage: blobEnabled() ? 'blob' : 'local' });
}

/** Adds photos after the ones already there. */
async function handlePOST(request) {
  const { response } = await guard(request);
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid upload.');
  }

  const id = idFrom(form.get('id'));
  if (!id) return fail('Unknown product.');

  const files = form.getAll('files').filter((f) => typeof f === 'object' && f.size);
  if (!files.length) return fail('Choose at least one image.');

  // Every file is checked and converted before any is written, so one bad
  // file does not leave half an upload behind.
  const converted = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const result = await toWebp(file);
    if (result.error) return fail(result.error);
    converted.push(result);
  }

  let before = 0;
  let after = 0;
  let count;

  if (blobEnabled()) {
    const set = await blobSet(id, request.url);
    let next = set.reduce((max, b) => Math.max(max, b.n), 0);
    for (const item of converted) {
      next += 1;
      // eslint-disable-next-line no-await-in-loop
      await putPublic(blobPath(id, next), item.buffer, 'image/webp');
      before += item.original;
      after += item.buffer.length;
    }
    count = set.length + converted.length;
  } else {
    await fs.mkdir(DIR, { recursive: true });
    // Continue the existing numbering, so a photo already referenced is never overwritten.
    const already = await localFiles(id);
    let next = already.reduce((max, f) => Math.max(max, numberOf(f)), 0);
    for (const item of converted) {
      next += 1;
      // eslint-disable-next-line no-await-in-loop
      await fs.writeFile(path.join(DIR, `product_${id}_${next}.webp`), item.buffer);
      before += item.original;
      after += item.buffer.length;
    }
    count = already.length + converted.length;
  }

  await afterChange(id, count);
  return Response.json({ ok: true, images: await listing(id), saved: { before, after } });
}

/** Replaces one photo in place: same position, new picture. */
async function handlePUT(request) {
  const { response } = await guard(request);
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid upload.');
  }

  const id = idFrom(form.get('id'));
  const name = String(form.get('name') || '');
  if (!id || !ownName(id, name)) return fail('Unknown image.');

  const result = await toWebp(form.get('file'));
  if (result.error) return fail(result.error);
  const n = numberOf(name);

  let count;
  if (blobEnabled()) {
    const set = await blobSet(id, request.url);
    const old = set.find((b) => b.n === n);
    if (!old) return fail('That photo no longer exists.');
    // The new one first, then the old one removed — a failure never leaves a gap.
    await putPublic(blobPath(id, n), result.buffer, 'image/webp');
    await removeBlobs(set.filter((b) => b.n === n).map((b) => b.url));
    count = set.length;
  } else {
    const current = await localFiles(id);
    if (!current.includes(name)) return fail('That photo no longer exists.');
    const target = `product_${id}_${n}.webp`;
    await fs.writeFile(path.join(DIR, target), result.buffer);
    if (target !== name) await fs.unlink(path.join(DIR, name)).catch(() => {});
    count = current.length;
  }

  await afterChange(id, count);
  return Response.json({
    ok: true,
    images: await listing(id),
    saved: { before: result.original, after: result.buffer.length },
  });
}

/** Makes one photo the main one by swapping its place with the first. */
async function handlePATCH(request) {
  const { response } = await guard(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const id = idFrom(body.id);
  const name = String(body.name || '');
  if (!id || !ownName(id, name)) return fail('Unknown image.');
  const n = numberOf(name);

  if (blobEnabled()) {
    const set = await blobSet(id, request.url);
    const chosen = set.find((b) => b.n === n);
    const first = set[0];
    if (!chosen) return fail('That photo no longer exists.');
    if (chosen.n !== first.n) {
      // Copies under the swapped numbers, then the originals removed.
      const ext = (b) => b.name.split('.').pop();
      await copyPublic(chosen.url, `uploads/product_image/product_${id}_${first.n}.${ext(chosen)}`);
      await copyPublic(first.url, `uploads/product_image/product_${id}_${chosen.n}.${ext(first)}`);
      await removeBlobs([chosen.url, first.url]);
    }
    await afterChange(id, set.length);
    return Response.json({ ok: true, images: await listing(id) });
  }

  const files = await localFiles(id);
  const first = files[0];
  if (!files.includes(name)) return fail('That photo no longer exists.');
  if (name === first) return Response.json({ ok: true, images: await listing(id) });

  const ext = (f) => f.split('.').pop();
  const temp = `swap_${id}_${Date.now()}.tmp`;
  // Three moves, so neither file is ever overwritten half-way through.
  await fs.rename(path.join(DIR, name), path.join(DIR, temp));
  await fs.rename(path.join(DIR, first), path.join(DIR, `product_${id}_${numberOf(name)}.${ext(first)}`));
  await fs.rename(path.join(DIR, temp), path.join(DIR, `product_${id}_${numberOf(first)}.${ext(name)}`));

  await afterChange(id, files.length);
  return Response.json({ ok: true, images: await listing(id) });
}

async function handleDELETE(request) {
  const { response } = await guard(request);
  if (response) return response;

  const url = new URL(request.url);
  const id = idFrom(url.searchParams.get('id'));
  const name = String(url.searchParams.get('name') || '');

  // Only a file that belongs to this product, and no path of the caller's own.
  if (!id || !ownName(id, name)) return fail('Unknown image.');

  let left;
  if (blobEnabled()) {
    const set = await blobSet(id, request.url);
    const n = numberOf(name);
    await removeBlobs(set.filter((b) => b.n === n).map((b) => b.url));
    left = set.filter((b) => b.n !== n).length;
  } else {
    await fs.unlink(path.join(DIR, name)).catch(() => { /* already gone */ });
    left = (await localFiles(id)).length;
  }

  await afterChange(id, left);
  return Response.json({ ok: true, images: await listing(id) });
}

// Every handler answers with a readable error rather than a bare 500.
export const GET = withUploadErrors(handleGET);
export const POST = withUploadErrors(handlePOST);
export const PUT = withUploadErrors(handlePUT);
export const PATCH = withUploadErrors(handlePATCH);
export const DELETE = withUploadErrors(handleDELETE);

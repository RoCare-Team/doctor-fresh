// Product photos.
//
// Files are written to public/uploads/product_image with the naming the whole
// site already reads — product_<id>_<n> — and `num_of_imgs` is updated so the
// storefront and the PHP panel both pick them up.
//
// Every upload is converted to WebP on the way in: a phone photo of several
// megabytes becomes a few hundred kilobytes, and the storefront's image
// optimiser has less to do on every visit.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { setImageCount } from '@/lib/sql/admin-catalog';
import { forgetMedia } from '@/lib/sql/media';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'product_image');
const PUBLIC = '/uploads/product_image';
const MAX_BYTES = 10 * 1024 * 1024;
// Big enough for the zoom panel on the product page, small enough to load fast.
const MAX_EDGE = 1600;
const ACCEPTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff', 'image/heic', 'image/heif',
]);

const numberOf = (file) => Number((file.match(/_(\d+)\.[a-z]+$/i) || [])[1] || 0);

/** The photos already on disk for this product, in display order. */
async function existing(id) {
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

/** What the admin sees: each photo's address, stamped so a replaced file is not served stale. */
async function listing(id) {
  const files = await existing(id);
  const out = [];
  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    const stat = await fs.stat(path.join(DIR, f)).catch(() => null);
    out.push({
      name: f,
      src: `${PUBLIC}/${f}`,
      preview: `${PUBLIC}/${f}?v=${stat ? Math.round(stat.mtimeMs) : Date.now()}`,
      size: stat?.size || 0,
    });
  }
  return out;
}

async function afterChange(id, count) {
  forgetMedia();
  try {
    await setImageCount(id, count);
  } catch (err) {
    console.error('[admin] could not update the image count:', err.message);
  }
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

const idFrom = (value) => Number(value) || 0;
const ownName = (id, name) => new RegExp(`^product_${id}_\\d+\\.[a-z]+$`, 'i').test(String(name || ''));

export async function GET(request) {
  const { response } = await requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');
  if (response) return response;

  const id = idFrom(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown product.');

  return Response.json({ ok: true, images: await listing(id) });
}

/** Adds photos after the ones already there. */
export async function POST(request) {
  const { response } = await requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');
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

  await fs.mkdir(DIR, { recursive: true });

  // Continue the existing numbering rather than restarting it, so a photo that
  // is already referenced is never overwritten.
  const already = await existing(id);
  let next = already.reduce((max, f) => Math.max(max, numberOf(f)), 0);

  let before = 0;
  let after = 0;
  for (const item of converted) {
    next += 1;
    // eslint-disable-next-line no-await-in-loop
    await fs.writeFile(path.join(DIR, `product_${id}_${next}.webp`), item.buffer);
    before += item.original;
    after += item.buffer.length;
  }

  await afterChange(id, already.length + converted.length);
  return Response.json({ ok: true, images: await listing(id), saved: { before, after } });
}

/** Replaces one photo in place: same position, new picture. */
export async function PUT(request) {
  const { response } = await requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');
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

  const current = await existing(id);
  if (!current.includes(name)) return fail('That photo no longer exists.');

  const result = await toWebp(form.get('file'));
  if (result.error) return fail(result.error);

  const target = `product_${id}_${numberOf(name)}.webp`;
  await fs.writeFile(path.join(DIR, target), result.buffer);
  if (target !== name) await fs.unlink(path.join(DIR, name)).catch(() => {});

  await afterChange(id, current.length);
  return Response.json({
    ok: true,
    images: await listing(id),
    saved: { before: result.original, after: result.buffer.length },
  });
}

/** Makes one photo the main one by swapping its place with the first. */
export async function PATCH(request) {
  const { response } = await requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');
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

  const files = await existing(id);
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

export async function DELETE(request) {
  const { response } = await requireAdmin('products', request.method === 'GET' ? 'view' : 'edit');
  if (response) return response;

  const url = new URL(request.url);
  const id = idFrom(url.searchParams.get('id'));
  const name = String(url.searchParams.get('name') || '');

  // Only a file that belongs to this product, and no path of the caller's own.
  if (!id || !ownName(id, name)) return fail('Unknown image.');

  await fs.unlink(path.join(DIR, name)).catch(() => {
    // Already gone — the count below still gets it right.
  });

  const left = await existing(id);
  await afterChange(id, left.length);
  return Response.json({ ok: true, images: await listing(id) });
}

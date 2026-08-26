// Product photos.
//
// Files are written to public/uploads/product_image with the naming the whole
// site already reads — product_<id>_<n>.jpg — and `num_of_imgs` is updated so
// the storefront and the PHP panel both pick them up.

import fs from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { setImageCount } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'product_image');
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    .sort((a, b) => Number(a.match(pattern)[1]) - Number(b.match(pattern)[1]));
}

export async function GET(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown product.');

  const files = await existing(id);
  return Response.json({ ok: true, images: files.map((f) => `/uploads/product_image/${f}`) });
}

export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid upload.');
  }

  const id = Number(form.get('id'));
  if (!id) return fail('Unknown product.');

  const files = form.getAll('files').filter((f) => typeof f === 'object' && f.size);
  if (!files.length) return fail('Choose at least one image.');

  for (const file of files) {
    if (!ALLOWED.has(file.type)) return fail('Only JPG, PNG or WebP images are accepted.');
    if (file.size > MAX_BYTES) return fail(`${file.name} is larger than 5 MB.`);
  }

  await fs.mkdir(DIR, { recursive: true });

  // Continue the existing numbering rather than restarting it, so a photo that
  // is already referenced is never overwritten.
  const already = await existing(id);
  let next = already.reduce((max, f) => Math.max(max, Number(f.match(/_(\d+)\.[a-z]+$/i)[1])), 0);

  const written = [];
  for (const file of files) {
    next += 1;
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const name = `product_${id}_${next}.${extension}`;
    // eslint-disable-next-line no-await-in-loop
    await fs.writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
    written.push(`/uploads/product_image/${name}`);
  }

  try {
    await setImageCount(id, already.length + written.length);
  } catch (err) {
    console.error('[admin] could not update the image count:', err.message);
  }

  return Response.json({ ok: true, images: [...already.map((f) => `/uploads/product_image/${f}`), ...written] });
}

export async function DELETE(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  const name = String(url.searchParams.get('name') || '');

  // Only a file that belongs to this product, and no path of the caller's own.
  if (!id || !new RegExp(`^product_${id}_\\d+\\.[a-z]+$`, 'i').test(name)) {
    return fail('Unknown image.');
  }

  try {
    await fs.unlink(path.join(DIR, name));
  } catch {
    // Already gone — the count below still gets it right.
  }

  const left = await existing(id);
  try {
    await setImageCount(id, left.length);
  } catch (err) {
    console.error('[admin] could not update the image count:', err.message);
  }

  return Response.json({ ok: true, images: left.map((f) => `/uploads/product_image/${f}`) });
}

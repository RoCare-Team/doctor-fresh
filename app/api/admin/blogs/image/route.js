// A post's cover image.
//
// Stored as public/uploads/blog_image/blog_<id>.webp — the name the storefront
// already looks for — and converted to WebP on the way in. Any older cover for
// the same post (blog_<id>.jpg, .png…) is removed so only one can be picked up.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { revalidatePath } from 'next/cache';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { forgetMedia } from '@/lib/sql/media';
import { UPLOAD_DIRS } from '@/lib/sql/schema';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'blog_image');
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff', 'image/heic', 'image/heif',
]);

async function removeCovers(id) {
  const pattern = new RegExp(`^blog_${id}\\.[a-z]+$`, 'i');
  const files = await fs.readdir(DIR).catch(() => []);
  await Promise.all(files.filter((f) => pattern.test(f)).map((f) => fs.unlink(path.join(DIR, f)).catch(() => {})));
}

function refresh() {
  forgetMedia(UPLOAD_DIRS.blog);
  try {
    revalidatePath('/blogs', 'layout');
    revalidatePath('/blog', 'layout');
  } catch { /* best-effort */ }
}

export async function POST(request) {
  const { response } = await requireAdmin('blogs', 'edit');
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid upload.');
  }

  const id = Number(form.get('id')) || 0;
  const file = form.get('file');
  if (!id) return fail('Unknown post.');
  if (!file || typeof file !== 'object' || !file.size) return fail('Choose an image.');
  if (!ACCEPTED.has(file.type)) return fail('Only PNG, JPG, WebP, GIF, AVIF or HEIC images are accepted.');
  if (file.size > MAX_BYTES) return fail('The image is larger than 10 MB.');

  let buffer;
  try {
    buffer = await sharp(Buffer.from(await file.arrayBuffer()), { animated: false })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return fail('That file could not be read as an image.');
  }

  await fs.mkdir(DIR, { recursive: true });
  await removeCovers(id);
  await fs.writeFile(path.join(DIR, `blog_${id}.webp`), buffer);
  refresh();

  return Response.json({ ok: true, src: `/uploads/blog_image/blog_${id}.webp?v=${Date.now()}`, size: buffer.length });
}

export async function DELETE(request) {
  const { response } = await requireAdmin('blogs', 'edit');
  if (response) return response;

  const id = Number(new URL(request.url).searchParams.get('id')) || 0;
  if (!id) return fail('Unknown post.');

  await removeCovers(id);
  refresh();
  return Response.json({ ok: true });
}

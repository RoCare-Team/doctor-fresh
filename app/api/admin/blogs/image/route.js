// A post's cover image.
//
// Saved as blog_<id>.webp — the name the storefront already looks for — in
// Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise in
// public/uploads/blog_image. Converted to WebP on the way in. Covers that came
// with the site stay as they are; an uploaded cover simply takes precedence.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { revalidatePath, revalidateTag } from 'next/cache';
import { BLOG_TAG } from '@/lib/sql/repository';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { forgetMedia } from '@/lib/sql/media';
import { UPLOAD_DIRS } from '@/lib/sql/schema';
import {
  blobEnabled, listAll, putPublic, removeBlobs, warmMedia, BLOG_FILE, withUploadErrors,
} from '@/lib/blob';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'blog_image');
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff', 'image/heic', 'image/heif',
]);

async function removeLocalCovers(id) {
  const pattern = new RegExp(`^blog_${id}\\.[a-z]+$`, 'i');
  const files = await fs.readdir(DIR).catch(() => []);
  await Promise.all(files.filter((f) => pattern.test(f)).map((f) => fs.unlink(path.join(DIR, f)).catch(() => {})));
}

/** This post's covers in Blob (normally one). */
async function blobCovers(id) {
  const blobs = await listAll(`uploads/blog_image/blog_${id}`);
  return blobs.filter((b) => {
    const m = b.pathname.split('/').pop().match(BLOG_FILE);
    return m && Number(m[1]) === Number(id);
  });
}

async function refresh() {
  forgetMedia(UPLOAD_DIRS.blog);
  await warmMedia({ force: true }).catch(() => {});
  try {
    revalidateTag(BLOG_TAG);
    revalidatePath('/blogs', 'layout');
    // The post pages are a dynamic route: the route itself has to be named,
    // or the stored copy of /blog/<id>/<slug> keeps being served for its
    // full five minutes after an edit.
    revalidatePath('/blog/[id]/[slug]', 'page');
  } catch { /* best-effort */ }
}

async function handlePOST(request) {
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

  let src;
  if (blobEnabled()) {
    const old = await blobCovers(id);
    const saved = await putPublic(`uploads/blog_image/blog_${id}.webp`, buffer, 'image/webp');
    await removeBlobs(old.map((b) => b.url));
    src = saved.url;
  } else {
    await fs.mkdir(DIR, { recursive: true });
    await removeLocalCovers(id);
    await fs.writeFile(path.join(DIR, `blog_${id}.webp`), buffer);
    src = `/uploads/blog_image/blog_${id}.webp?v=${Date.now()}`;
  }

  await refresh();
  return Response.json({ ok: true, src, size: buffer.length });
}

async function handleDELETE(request) {
  const { response } = await requireAdmin('blogs', 'edit');
  if (response) return response;

  const id = Number(new URL(request.url).searchParams.get('id')) || 0;
  if (!id) return fail('Unknown post.');

  if (blobEnabled()) await removeBlobs((await blobCovers(id)).map((b) => b.url));
  else await removeLocalCovers(id);

  await refresh();
  return Response.json({ ok: true });
}

// Every handler answers with a readable error rather than a bare 500.
export const POST = withUploadErrors(handlePOST);
export const DELETE = withUploadErrors(handleDELETE);

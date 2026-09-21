// Images placed inside rich text — a product description, a blog post.
//
// They are not product photos, so they do not join the product_<id>_<n>
// numbering; each gets its own name under public/uploads/editor and the editor
// puts the returned address straight into the HTML it saves. With
// BLOB_READ_WRITE_TOKEN set (Vercel) they go to Vercel Blob instead, since a
// file written into public/ at runtime is never served there.
//
// Every picture is stored as WebP (resized to at most 2000 px); an animated
// GIF stays animated. Videos are stored as they are.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { requireAdmin, fail } from '@/lib/admin/guard';
import {
  blobEnabled, putPublic, withUploadErrors,
} from '@/lib/blob';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'editor');
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 2000;
const EXTENSIONS = {
  'image/jpeg': 'webp',
  'image/png': 'webp',
  'image/webp': 'webp',
  'image/gif': 'webp',
  'image/avif': 'webp',
  'image/tiff': 'webp',
  'image/heic': 'webp',
  'image/heif': 'webp',
  // Videos, for servers without Vercel Blob; on Vercel they upload straight to Blob.
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

async function handlePOST(request) {
  const { response } = await requireAdmin(['products', 'categories', 'blogs', 'service_pages', 'settings', 'home', 'content'], 'edit');
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid upload.');
  }

  const file = form.get('file');
  if (!file || typeof file !== 'object' || !file.size) return fail('Choose an image.');

  const extension = EXTENSIONS[file.type];
  if (!extension) return fail('Only JPG, PNG, WebP, GIF, AVIF or HEIC images, or MP4 / WebM videos, are accepted.');
  const isVideo = file.type.startsWith('video/');
  if (file.size > (isVideo ? VIDEO_MAX_BYTES : MAX_BYTES)) {
    return fail(isVideo ? 'Videos must be 100 MB or smaller.' : 'Images must be 10 MB or smaller.');
  }

  // A random name, never the one the browser sent: nothing the caller types
  // decides where on disk the file lands.
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  let body = Buffer.from(await file.arrayBuffer());
  let type = file.type;
  if (!isVideo) {
    try {
      body = await sharp(body, { animated: file.type === 'image/gif' })
        .rotate() // honour the phone's orientation flag before it is stripped
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      type = 'image/webp';
    } catch {
      return fail('That file could not be read as an image.');
    }
  }

  if (blobEnabled()) {
    const saved = await putPublic(`uploads/editor/${name}`, body, type);
    return Response.json({ ok: true, url: saved.url });
  }

  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, name), body);
  return Response.json({ ok: true, url: `/uploads/editor/${name}` });
}

// Every handler answers with a readable error rather than a bare 500.
export const POST = withUploadErrors(handlePOST);

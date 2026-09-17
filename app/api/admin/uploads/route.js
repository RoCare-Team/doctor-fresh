// Images placed inside rich text — a product description, a blog post.
//
// They are not product photos, so they do not join the product_<id>_<n>
// numbering; each gets its own name under public/uploads/editor and the editor
// puts the returned address straight into the HTML it saves.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin, fail } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

const DIR = path.join(process.cwd(), 'public', 'uploads', 'editor');
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request) {
  const { response } = await requireAdmin();
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
  if (!extension) return fail('Only JPG, PNG, WebP or GIF images are accepted.');
  if (file.size > MAX_BYTES) return fail('Images must be 5 MB or smaller.');

  await fs.mkdir(DIR, { recursive: true });

  // A random name, never the one the browser sent: nothing the caller types
  // decides where on disk the file lands.
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  await fs.writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));

  return Response.json({ ok: true, url: `/uploads/editor/${name}` });
}

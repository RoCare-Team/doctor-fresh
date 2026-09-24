// How big a picture actually is.
//
// Covers are made outside the site and come in every shape, so a frame with a
// fixed shape either crops them or leaves a band around them. Knowing the real
// proportions lets the frame take the picture's own shape — no crop, no gap,
// and no jump while the page loads, because the space is reserved correctly
// from the first paint.
//
// Only the header of the file is read, and the answer is kept in the shared
// store for a week: a picture's proportions do not change, and a replaced
// cover gets a new file name.

import { unstable_cache } from 'next/cache';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HEADER_BYTES = 96 * 1024;

async function readHeader(src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src, { headers: { Range: `bytes=0-${HEADER_BYTES - 1}` } });
    if (!res.ok && res.status !== 206) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  // A file shipped with the site, under public/.
  const file = path.join(process.cwd(), 'public', src.replace(/^\/+/, ''));
  const handle = await fs.open(file, 'r').catch(() => null);
  if (!handle) return null;
  try {
    const buffer = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

const measure = unstable_cache(
  async (src) => {
    const header = await readHeader(src);
    const { width, height } = header?.length ? await sharp(header).metadata() : {};
    // Thrown rather than returned, so a file that was briefly unreachable is
    // not remembered as unmeasurable for the rest of the week.
    if (!width || !height) throw new Error('could not measure');
    return { width, height };
  },
  ['df-image-size'],
  { revalidate: 604_800 },
);

/** `{ width, height }`, or null when it could not be read. */
export async function imageSize(src) {
  if (!src) return null;
  try {
    return await measure(String(src));
  } catch {
    // A format sharp cannot read, a file that has gone, or a bad moment: the
    // caller falls back to a frame of its own choosing.
    return null;
  }
}

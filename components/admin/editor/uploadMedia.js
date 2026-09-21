'use client';

// Uploads a picture or video from the admin and returns its address.
//
// With Vercel Blob available the file goes straight from the browser to Blob
// (no size limit from our server — videos can be hundreds of MB). Without it
// (a local or non-Vercel server) small files go through /api/admin/uploads.
//
// Every picture is stored as WebP: it is converted here in the browser before
// a direct upload, and by the server (sharp) when it goes through our route.
// SVG icons stay SVG — they are drawings, not photos.

let blobCheck = null;
function directUploadsAvailable() {
  blobCheck ??= fetch('/api/admin/blob-upload')
    .then((r) => r.json())
    .then((d) => Boolean(d?.blob))
    .catch(() => false);
  return blobCheck;
}

const safeName = (name) => String(name || 'file')
  .toLowerCase()
  .replace(/[^a-z0-9.]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(-60) || 'file';

// Big enough for a full-width banner, small enough to load fast.
const MAX_EDGE = 2000;
const QUALITY = 0.85;
// Vercel refuses a request to our own routes above 4.5 MB.
const ROUTE_LIMIT = 4 * 1024 * 1024;

const webpName = (name) => `${String(name || 'image').replace(/\.[a-z0-9]+$/i, '')}.webp`;

/**
 * The picture re-drawn as WebP (resized to MAX_EDGE), or null when this
 * browser cannot encode WebP or cannot read the file.
 */
async function toWebp(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/webp', QUALITY); });
    // Browsers that cannot write WebP quietly hand back a PNG instead.
    if (!blob || blob.type !== 'image/webp') return null;
    return new File([blob], webpName(file.name), { type: 'image/webp' });
  } catch {
    return null;
  }
}

async function viaServer(file) {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/admin/uploads', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

/**
 * @param {File} file
 * @param {{ folder?: 'editor'|'video'|'home', onProgress?: (percent:number)=>void }} options
 * @returns {Promise<string>} the uploaded file's public URL
 */
export async function uploadMedia(file, { folder, onProgress } = {}) {
  const isVideo = file.type.startsWith('video/');
  const isSvg = file.type === 'image/svg+xml';
  const dir = folder || (isVideo ? 'video' : 'editor');
  const direct = await directUploadsAvailable();

  let upload = file;
  if (!isVideo && !isSvg) {
    // A GIF may be animated — the server keeps the animation in WebP, the
    // browser cannot, so small GIFs go through the server.
    if (file.type === 'image/gif' && file.size <= ROUTE_LIMIT) return viaServer(file);
    if (direct) {
      const converted = file.type === 'image/gif' ? null : await toWebp(file);
      if (converted) upload = converted;
      // Not convertible here: the server converts it, when it fits through.
      else if (file.size <= ROUTE_LIMIT) return viaServer(file);
    }
  }

  if (direct) {
    const { upload: put } = await import('@vercel/blob/client');
    const result = await put(`uploads/${dir}/${Date.now()}-${safeName(upload.name)}`, upload, {
      access: 'public',
      handleUploadUrl: '/api/admin/blob-upload',
      clientPayload: isVideo ? 'video' : 'image',
      multipart: upload.size > 20 * 1024 * 1024,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    });
    return result.url;
  }

  return viaServer(upload);
}

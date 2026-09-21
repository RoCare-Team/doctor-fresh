'use client';

// Uploads a picture or video from the admin and returns its address.
//
// With Vercel Blob available the file goes straight from the browser to Blob
// (no size limit from our server — videos can be hundreds of MB). Without it
// (a local or non-Vercel server) small files go through /api/admin/uploads.

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

/**
 * @param {File} file
 * @param {{ folder?: 'editor'|'video'|'home', onProgress?: (percent:number)=>void }} options
 * @returns {Promise<string>} the uploaded file's public URL
 */
export async function uploadMedia(file, { folder, onProgress } = {}) {
  const isVideo = file.type.startsWith('video/');
  const dir = folder || (isVideo ? 'video' : 'editor');

  if (await directUploadsAvailable()) {
    const { upload } = await import('@vercel/blob/client');
    const result = await upload(`uploads/${dir}/${Date.now()}-${safeName(file.name)}`, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/blob-upload',
      clientPayload: isVideo ? 'video' : 'image',
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    });
    return result.url;
  }

  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/admin/uploads', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

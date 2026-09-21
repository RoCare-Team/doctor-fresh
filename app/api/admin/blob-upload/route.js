// Uploads that go straight from the admin's browser to Vercel Blob.
//
// Vercel stops any request to a function at 4.5 MB, so a video (or a large
// photo) cannot pass through our own routes. Instead this route only hands
// the browser a short-lived, single-file permission for Blob — after checking
// who is asking — and the file itself travels directly to Blob.
//
//   GET  → { blob: true|false }  whether direct uploads are available here
//   POST → the token exchange used by upload() from @vercel/blob/client

import { handleUpload } from '@vercel/blob/client';
import { requireAdmin, fail } from '@/lib/admin/guard';
import { blobEnabled, blobToken } from '@/lib/blob';

export const dynamic = 'force-dynamic';

// Anyone who may edit a section with rich content may upload into it.
const EDITORS = ['products', 'categories', 'blogs', 'service_pages', 'settings', 'home', 'content'];

const LIMITS = {
  video: { types: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'], max: 200 * 1024 * 1024 },
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'], max: 20 * 1024 * 1024 },
};

export async function GET() {
  const { response } = await requireAdmin(EDITORS, 'edit');
  if (response) return response;
  return Response.json({ ok: true, blob: blobEnabled() });
}

export async function POST(request) {
  if (!blobEnabled()) return fail('Direct uploads need the Vercel Blob token on this deployment.', 501);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  // The completion callback comes from Vercel itself (signed), not from a
  // signed-in admin, so only the token request is checked for a session.
  if (body?.type === 'blob.generate-client-token') {
    const { response } = await requireAdmin(EDITORS, 'edit');
    if (response) return response;
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: blobToken(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Only our own folders, never a path of the caller's choosing elsewhere.
        if (!/^uploads\/(editor|video|home)\/[\w.-]+$/.test(pathname)) throw new Error('Not an allowed upload path.');
        const kind = clientPayload === 'video' ? 'video' : 'image';
        return {
          allowedContentTypes: LIMITS[kind].types,
          maximumSizeInBytes: LIMITS[kind].max,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
      // Nothing to record: the page that asked for the upload saves the URL.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return fail(err.message || 'Upload could not start.', 400);
  }
}

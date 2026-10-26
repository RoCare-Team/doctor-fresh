// POST /api/admin/whatsapp-campaign/media — an image for a WhatsApp campaign's
// header, stored in the site's public file store (Vercel Blob). Answers its
// public https address, which is then sent with the campaign: a campaign's
// own saved media expires on WhatsApp's side ("Media upload error #131053").
//
// multipart/form-data: file (JPEG or PNG, up to 5 MB — WhatsApp's limits).

import { requireAdmin, fail } from '@/lib/admin/guard';
import { blobEnabled, putPublic, withUploadErrors } from '@/lib/blob';

export const dynamic = 'force-dynamic';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_BYTES = 5 * 1024 * 1024;

export const POST = withUploadErrors(async (request) => {
  const { response } = await requireAdmin('customers', 'edit');
  if (response) return response;
  if (!blobEnabled()) return fail('File storage is not set up on this server (BLOB_READ_WRITE_TOKEN).', 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return fail('Choose an image to upload.');

  const ext = TYPES[file.type];
  if (!ext) return fail('WhatsApp accepts JPG or PNG images only.');
  if (file.size > MAX_BYTES) return fail('The image must be 5 MB or smaller.');

  const saved = await putPublic(`uploads/whatsapp/campaign.${ext}`, Buffer.from(await file.arrayBuffer()), file.type);
  return Response.json({ ok: true, url: saved.url });
});

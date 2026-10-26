// POST /api/admin/whatsapp-campaign — send one WhatsApp campaign (a template
// set up on limbu.ai, e.g. diwali_bonus_campaign) to the chosen customers.
//
// Body: { campaign, ids: [customer id…], withName?: boolean, mediaUrl?: https URL }
// Only customer ids are accepted; their names and numbers are read here, so
// this cannot be used to message numbers that are not customers.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { listCustomers } from '@/lib/sql/admin-catalog';
import { sendBulkCampaign } from '@/lib/whatsapp';
import { logActivity } from '@/lib/sql/activity';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { admin, response } = await requireAdmin('customers', 'edit');
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const campaign = String(body.campaign || '').trim();
  if (!/^[a-z0-9_-]{2,80}$/i.test(campaign)) return fail('Enter the campaign name as it is on limbu.ai, e.g. diwali_bonus_campaign.');

  const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean));
  if (!ids.size) return fail('Select at least one customer.');

  const all = await listCustomers({ search: '', limit: 100000 });
  if (!all) return fail('Could not read the customers right now.', 502);
  const chosen = all.filter((c) => ids.has(Number(c.id)));
  if (!chosen.length) return fail('None of the selected customers were found.');

  const mediaUrl = String(body.mediaUrl || '').trim();
  if (mediaUrl && !/^https:\/\/\S+$/i.test(mediaUrl)) return fail('The image address must be a public https:// link.');

  const result = await sendBulkCampaign({
    campaign, customers: chosen, withName: Boolean(body.withName), mediaUrl,
  });

  await logActivity({
    admin,
    section: 'customers',
    action: 'edited',
    target: `WhatsApp: ${campaign}`,
    detail: `queued ${result.sent}, failed ${result.failed}, rejected by limbu ${result.invalid || 0}, no valid number ${result.skipped}`,
  });

  if (!result.ok) {
    return fail(result.error || `The campaign was not accepted (${result.failed} not sent). Check the campaign name on limbu.ai.`, 502);
  }
  return Response.json({ ok: true, sent: result.sent, skipped: result.skipped, invalid: result.invalid || 0 });
}

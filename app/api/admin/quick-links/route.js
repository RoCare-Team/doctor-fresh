import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  createQuickLink, updateQuickLink, deleteQuickLink, forgetQuickLinks,
} from '@/lib/sql/quick-links';
import { listLandingPages } from '@/lib/sql/admin-landing';

export const dynamic = 'force-dynamic';

/** Page search for the picker: live service / city pages by name or URL. */
export async function GET(request) {
  const { response } = await requireAdmin('quick_links', 'view');
  if (response) return response;
  const search = (new URL(request.url).searchParams.get('search') || '').trim().slice(0, 100);
  const list = await listLandingPages({ search, status: 'live', perPage: 40 }).catch(() => null);
  if (!list) return fail('Could not search the pages.', 502);
  return Response.json({
    ok: true,
    total: list.total,
    pages: list.rows.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
  });
}

async function run(work, label) {
  try {
    const result = await work();
    if (result?.error) return fail(result.error);
    forgetQuickLinks();
    try { revalidatePath('/'); } catch { /* best-effort */ }
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[admin] could not ${label}:`, err.message);
    return fail(`Could not ${label}. Please try again.`, 502);
  }
}

export async function POST(request) {
  const { response } = await requireAdmin('quick_links', request);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  return run(() => createQuickLink(body), 'create the section');
}

export async function PATCH(request) {
  const { response } = await requireAdmin('quick_links', request);
  if (response) return response;
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown section.');
  return run(() => updateQuickLink(id, body), 'save the section');
}

export async function DELETE(request) {
  const { response } = await requireAdmin('quick_links', request);
  if (response) return response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown section.');
  return run(() => deleteQuickLink(id), 'delete the section');
}

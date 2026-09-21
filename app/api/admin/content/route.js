import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { saveContent, saveLegalPage, CONTENT_DEFAULTS } from '@/lib/sql/site-content';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

/** { key, value } for a content section, or { legal: slug, html } for a policy page. */
export async function PATCH(request) {
  const { response } = await requireAdmin('content', 'edit');
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  try {
    if (body.legal) {
      const saved = await saveLegalPage(String(body.legal), body.html);
      if (saved.error) return fail(saved.error);
      clearCache(); // the legal pages are read through the shared settings cache
      try { revalidatePath(`/legal/${body.legal}`); } catch { /* best-effort */ }
      return Response.json({ ok: true });
    }
    // The test contacts belong to the Orders page and its permission.
    if (!CONTENT_DEFAULTS[body.key] || body.key === 'order_settings') return fail('Unknown section.');
    const saved = await saveContent(body.key, body.value || {});
    if (saved.error) return fail(saved.error);
    // The menu and footer are on every page; the rest on a few.
    try { revalidatePath('/', 'layout'); } catch { /* best-effort */ }
    return Response.json({ ok: true, value: saved.value });
  } catch (err) {
    console.error('[admin] could not save site content:', err.message);
    return fail('Could not save. Please try again.', 502);
  }
}

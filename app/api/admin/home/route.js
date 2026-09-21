import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { saveHomeContent } from '@/lib/sql/site-content';

export const dynamic = 'force-dynamic';

/** Saves the home page's search listing and hero banner. */
export async function PATCH(request) {
  const { response } = await requireAdmin('home', 'edit');
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let saved;
  try {
    saved = await saveHomeContent(body);
  } catch (err) {
    console.error('[admin] could not save the home page:', err.message);
    return fail('Could not save the home page.', 502);
  }
  if (saved.error) return fail(saved.error);

  try { revalidatePath('/'); } catch { /* best-effort */ }
  return Response.json({ ok: true, content: saved.value });
}

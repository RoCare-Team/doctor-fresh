import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  updateLandingPage, createLandingPage, deleteLandingPage, forgetLandingFamilies,
} from '@/lib/sql/admin-landing';
import { forgetLandingPage } from '@/lib/sql/landing';
import { saveRedirect } from '@/lib/sql/redirects';

export const dynamic = 'force-dynamic';

/** The storefront caches rows in memory and pages on disk; both are refreshed. */
function refresh(...slugs) {
  forgetLandingPage(...slugs);
  forgetLandingFamilies();
  for (const slug of slugs) {
    if (!slug) continue;
    try { revalidatePath(`/${slug}`); } catch { /* best-effort */ }
  }
}

export async function PATCH(request) {
  const { response } = await requireAdmin('service_pages', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown page.');
  if (body.metaTitle !== undefined && String(body.metaTitle).length > 255) return fail('The meta title is longer than 255 characters.');

  let saved;
  try {
    saved = await updateLandingPage(id, body);
  } catch (err) {
    console.error('[admin] could not save the service page:', err.message);
    return fail('Could not save the page.', 502);
  }
  if (saved.error) return fail(saved.error);

  // A moved page keeps its old links working.
  let redirect = null;
  if (body.redirectOld && saved.oldSlug && saved.oldSlug !== saved.slug) {
    redirect = await saveRedirect({ source: `/${saved.oldSlug}`, destination: `/${saved.slug}`, type: 301 })
      .catch(() => ({ ok: false, error: 'The redirect could not be saved.' }));
  }

  refresh(saved.oldSlug, saved.slug);
  return Response.json({ ok: true, slug: saved.slug, redirect });
}

export async function POST(request) {
  const { response } = await requireAdmin('service_pages', request);
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  let created;
  try {
    created = await createLandingPage(body);
  } catch (err) {
    console.error('[admin] could not create the service page:', err.message);
    return fail('Could not create the page.', 502);
  }
  if (created.error) return fail(created.error);

  refresh(created.slug);
  return Response.json({ ok: true, ...created });
}

export async function DELETE(request) {
  const { response } = await requireAdmin('service_pages', request);
  if (response) return response;

  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown page.');

  let done;
  try {
    done = await deleteLandingPage(id);
  } catch (err) {
    console.error('[admin] could not delete the service page:', err.message);
    return fail('Could not delete the page.', 502);
  }
  if (done.error) return fail(done.error);

  let redirect = null;
  if (body.redirectTo) {
    redirect = await saveRedirect({ source: `/${done.slug}`, destination: body.redirectTo, type: 301 })
      .catch(() => ({ ok: false, error: 'The redirect could not be saved.' }));
  }

  refresh(done.slug);
  return Response.json({ ok: true, ...done, redirect });
}

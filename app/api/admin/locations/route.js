import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  createLocation, updateLocation, deleteLocation, importLocations, forgetLocations,
} from '@/lib/sql/locations';

export const dynamic = 'force-dynamic';

function refresh() {
  forgetLocations();
  try {
    revalidatePath('/store-locator');
    // Service pages show nearby branches; they pick the change up as they refresh.
    revalidatePath('/[slug]', 'page');
  } catch { /* best-effort */ }
}

async function run(work, label) {
  try {
    const result = await work();
    if (result?.error) return fail(result.error);
    refresh();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[admin] could not ${label}:`, err.message);
    return fail(`Could not ${label}. Please try again.`, 502);
  }
}

/** One location, or `{ rows: [...] }` from the CSV import. */
export async function POST(request) {
  const { response } = await requireAdmin('locations', request);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  if (Array.isArray(body.rows)) return run(() => importLocations(body.rows), 'import the locations');
  return run(() => createLocation(body), 'add the location');
}

export async function PATCH(request) {
  const { response } = await requireAdmin('locations', request);
  if (response) return response;
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!id) return fail('Unknown location.');
  return run(() => updateLocation(id, body), 'save the location');
}

export async function DELETE(request) {
  const { response } = await requireAdmin('locations', request);
  if (response) return response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown location.');
  return run(() => deleteLocation(id), 'delete the location');
}

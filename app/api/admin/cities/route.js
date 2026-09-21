import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  saveCity, saveState, deleteCity, deleteState, setCityActive,
} from '@/lib/sql/geo';
import { clearCache } from '@/lib/sql/cache';

export const dynamic = 'force-dynamic';

async function run(work, label) {
  try {
    const result = await work();
    if (result?.error) return fail(result.error);
    // The form dropdowns cache the state list; a change shows at once.
    clearCache();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[admin] could not ${label}:`, err.message);
    return fail(`Could not ${label}. Please try again.`, 502);
  }
}

/** Add: { kind: 'city'|'state', ...fields } */
export async function POST(request) {
  const { response } = await requireAdmin('cities', request);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  const { id: _ignored, ...fields } = body;
  return body.kind === 'state' ? run(() => saveState(fields), 'add the state') : run(() => saveCity(fields), 'add the city');
}

/** Edit: { kind, id, ...fields }, or { kind: 'city', id, active } to switch one on/off. */
export async function PATCH(request) {
  const { response } = await requireAdmin('cities', request);
  if (response) return response;
  const body = await readJson(request);
  if (!Number(body?.id)) return fail('Unknown record.');
  if (body.kind === 'state') return run(() => saveState(body), 'save the state');
  if (Object.keys(body).every((k) => ['kind', 'id', 'active'].includes(k))) {
    return run(() => setCityActive(Number(body.id), body.active !== false), 'update the city');
  }
  return run(() => saveCity(body), 'save the city');
}

export async function DELETE(request) {
  const { response } = await requireAdmin('cities', request);
  if (response) return response;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return fail('Unknown record.');
  return url.searchParams.get('kind') === 'state'
    ? run(() => deleteState(id), 'delete the state')
    : run(() => deleteCity(id), 'delete the city');
}

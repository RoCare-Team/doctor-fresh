// The redirect manager's API: list, add, edit, delete and bulk import rules.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  listRedirects, saveRedirect, deleteRedirects, importRedirects,
} from '@/lib/sql/redirects';
import { parseImport } from '@/lib/redirects';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const redirects = await listRedirects();
  if (!redirects) return fail('Could not read redirects right now.', 503);
  return Response.json({ ok: true, redirects });
}

/** Adds one rule, or with `{ import: "…text…" }` many. */
export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  if (typeof body.import === 'string') {
    const { rows, errors } = parseImport(body.import, body.collection || 'pages');
    if (!rows.length) return fail(errors[0] || 'No redirects found in that list.');
    if (rows.length > 5000) return fail('Import at most 5,000 redirects at a time.');

    const result = await importRedirects(rows);
    if (!result.ok) return fail(result.error, 503);
    return Response.json({ ...result, failed: [...errors, ...result.failed] });
  }

  const result = await saveRedirect({ ...body, id: undefined });
  return result.ok ? Response.json({ ok: true }) : fail(result.error);
}

export async function PUT(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body?.id) return fail('Unknown redirect.');

  const result = await saveRedirect(body);
  return result.ok ? Response.json({ ok: true }) : fail(result.error);
}

export async function DELETE(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  const result = await deleteRedirects(body?.ids);
  return result.ok ? Response.json(result) : fail(result.error);
}

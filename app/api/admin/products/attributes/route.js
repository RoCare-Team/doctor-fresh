// New highlight labels and values.
//
// These are the two tables the PHP panel fills — `attribute` (the label, e.g.
// Warranty) and `attribute_filter` (its values, e.g. "2 Years - Only Service").
// Adding one here writes exactly the row that panel would write, so both sides
// keep working off the same list.

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { createAttribute, createAttributeValue } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { response } = await requireAdmin('products', 'create');
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const title = String(body.title ?? '').trim();
  if (!title) return fail('Enter a name.');
  if (title.length > 200) return fail('That name is too long.');

  const attributeId = Number(body.attributeId) || 0;

  try {
    const made = attributeId
      ? await createAttributeValue(attributeId, title)
      : await createAttribute(title);
    if (made.error) return fail(made.error);
    return Response.json({ ok: true, ...made });
  } catch (err) {
    console.error('[admin] could not add the attribute:', err.message);
    return fail('Could not save it. Please try again.', 502);
  }
}

import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import { createCoupon, deleteCoupon } from '@/lib/sql/admin-catalog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await readJson(request);
  if (!body) return fail('Invalid request.');

  const code = String(body.code ?? '').trim();
  if (!code) return fail('Enter a coupon code.');

  const value = Number(body.value);
  if (!value || value <= 0) return fail('Enter a discount greater than zero.');
  if (body.type === 'percent' && value > 100) return fail('A percentage discount cannot exceed 100.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.till ?? ''))) return fail('Choose a valid expiry date.');

  try {
    await createCoupon({ title: body.title, code, till: body.till, type: body.type, value });
  } catch (err) {
    console.error('[admin] could not create the coupon:', err.message);
    return fail('Could not create the coupon.', 502);
  }

  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('Unknown coupon.');

  try {
    await deleteCoupon(id);
  } catch (err) {
    console.error('[admin] could not delete the coupon:', err.message);
    return fail('Could not delete the coupon.', 502);
  }

  return Response.json({ ok: true });
}

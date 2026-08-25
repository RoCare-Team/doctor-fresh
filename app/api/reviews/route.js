// A customer's rating and review of a product.

import { isDbEnabled } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { rateProduct } from '@/lib/sql/engagement';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Reviews are unavailable right now.', 503);

  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: 'Please sign in to review.', signIn: true }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const result = await rateProduct({
    userId: session.id,
    productId: body.productId,
    rating: body.rating,
    comment: body.comment,
    userName: session.name,
  });

  if (!result.ok) return fail(result.reason);
  return Response.json({ ok: true });
}

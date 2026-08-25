// Easebuzz sends the visitor back here when a payment did not go through.
//
// The attempt is marked failed and the visitor returns to the checkout, where
// they can try again. The order row stays as it is, unpaid, with no stock
// taken — matching easebuzz_failed() in Home.php.

import { markPaymentFailed, parseTxnId } from '@/lib/sql/easebuzz';

export const dynamic = 'force-dynamic';

async function readPayload(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  const form = await request.formData().catch(() => null);
  return form ? Object.fromEntries(form.entries()) : {};
}

async function handle(request, payload) {
  try {
    await markPaymentFailed(parseTxnId(payload.txnid), payload);
  } catch (err) {
    console.error('[easebuzz] could not record the failed payment:', err.message);
  }

  const url = new URL('/cart-checkout', request.url);
  url.searchParams.set('payment', 'failed');
  return Response.redirect(url, 303);
}

export async function POST(request) {
  return handle(request, await readPayload(request));
}

export async function GET(request) {
  return handle(request, Object.fromEntries(new URL(request.url).searchParams.entries()));
}

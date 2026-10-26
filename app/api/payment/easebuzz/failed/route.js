// Easebuzz sends the visitor back here when a payment did not go through.
//
// The attempt is marked failed (when the callback is Easebuzz's own), the
// service system is told, and the visitor returns to the checkout, where
// they can try again. The order row stays as it is, unpaid, with no stock
// taken — matching easebuzz_failed() in Home.php.

import { after } from 'next/server';
import { markPaymentFailed, parseTxnId, verifyEasebuzzPayment } from '@/lib/sql/easebuzz';
import { forwardPaymentStatus } from '@/lib/services/product-lead';

export const dynamic = 'force-dynamic';

async function readPayload(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  const form = await request.formData().catch(() => null);
  return form ? Object.fromEntries(form.entries()) : {};
}

async function handle(request, payload) {
  // This URL is public too: only a failure Easebuzz signed is recorded and
  // passed on to the service system.
  const verified = await verifyEasebuzzPayment(payload, { expectSuccess: false }).catch((err) => ({ ok: false, reason: err.message }));
  if (verified.ok) {
    try {
      await markPaymentFailed(parseTxnId(payload.txnid), payload);
    } catch (err) {
      console.error('[easebuzz] could not record the failed payment:', err.message);
    }
    const saleId = Number(payload.udf1 || payload.unique_id) || 0;
    after(() => forwardPaymentStatus({ orderId: saleId, status: 'failed', response: payload }));
  } else {
    console.error('[easebuzz] failure callback not verified:', verified.reason);
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

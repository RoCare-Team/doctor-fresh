// Easebuzz sends the visitor back here after a successful payment.
//
// The gateway POSTs a form, so the order is marked paid and the browser is
// redirected to the confirmation page — the same work easebuzz_success() does
// in Home.php.

import { markPaymentSuccess, parseTxnId } from '@/lib/sql/easebuzz';
import { reserveStockForOrder } from '@/lib/sql/orders';

export const dynamic = 'force-dynamic';

async function readPayload(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  const form = await request.formData().catch(() => null);
  return form ? Object.fromEntries(form.entries()) : {};
}

async function handle(request, payload) {
  const transactionId = parseTxnId(payload.txnid);
  const saleId = Number(payload.udf1 || payload.unique_id) || null;

  let guestId = null;
  try {
    const result = await markPaymentSuccess({ transactionId, saleId, payload });
    guestId = result?.guestId || null;
    // Stock was held back until the payment was confirmed.
    if (saleId) await reserveStockForOrder(saleId);
  } catch (err) {
    // The customer has paid; never show them an error over our bookkeeping.
    console.error('[easebuzz] could not finalise the order:', err.message);
  }

  const target = guestId ? `/order/${guestId}` : `/order/${saleId ?? ''}`;
  return Response.redirect(new URL(target, request.url), 303);
}

export async function POST(request) {
  return handle(request, await readPayload(request));
}

/** Some gateway configurations return with a GET. */
export async function GET(request) {
  return handle(request, Object.fromEntries(new URL(request.url).searchParams.entries()));
}

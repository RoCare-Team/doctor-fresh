// The payment for a service visit did not go through.
//
// The booking stays as it was written — unpaid — so the customer can try
// again or simply pay the technician after the visit.

import { markPaymentFailed, parseTxnId } from '@/lib/sql/easebuzz';
import { markPayment } from '@/lib/sql/service-bookings';

export const dynamic = 'force-dynamic';

async function readPayload(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  const form = await request.formData().catch(() => null);
  return form ? Object.fromEntries(form.entries()) : {};
}

async function handle(request, payload) {
  const transactionId = parseTxnId(payload.txnid);
  const bookingId = Number(payload.udf1 || payload.unique_id) || null;

  try {
    if (bookingId) await markPayment(bookingId, { status: 'failed', txnId: transactionId });
    await markPaymentFailed(transactionId, payload).catch(() => {});
  } catch (err) {
    console.error('[booking] could not record the failed payment:', err.message);
  }

  return Response.redirect(new URL('/book/checkout?payment=failed', request.url), 303);
}

export async function POST(request) {
  return handle(request, await readPayload(request));
}

export async function GET(request) {
  return handle(request, Object.fromEntries(new URL(request.url).searchParams.entries()));
}

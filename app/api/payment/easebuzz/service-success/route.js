// Easebuzz sends the customer back here after paying for a service visit.
//
// The visit is only handed to the service system now: a technician should
// never be dispatched against a payment that never arrived.

import { after } from 'next/server';
import { markPaymentSuccess, parseTxnId } from '@/lib/sql/easebuzz';
import { getBooking, markPayment, markSentToService } from '@/lib/sql/service-bookings';
import { createBooking } from '@/lib/services/wizard';
import { SITE_URL } from '@/lib/utils';

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

  let ref = '';
  try {
    const booking = bookingId ? await getBooking(bookingId) : null;
    if (booking) {
      ref = booking.ref;
      await markPayment(bookingId, { status: 'paid', txnId: transactionId });

      // The gateway is waiting for this response, so the visit is sent to the
      // service system after it has been answered.
      after(async () => {
        const result = await createBooking({
          name: booking.name,
          mobile: booking.mobile,
          email: booking.email,
          pincode: booking.pincode,
          houseNo: booking.houseNo,
          area: booking.area,
          state: booking.state,
          city: booking.city,
          siteUrl: `${SITE_URL}/book`,
        }).catch((err) => ({ ok: false, reason: err.message }));

        if (result?.ok) await markSentToService(bookingId, result.reference || '').catch(() => {});
        else console.error('[booking] paid but not sent to the service system:', result?.reason);
      });
    }

    // Recorded against the payments table too, as a product order would be.
    await markPaymentSuccess({ transactionId, saleId: null, payload }).catch(() => {});
  } catch (err) {
    // They have paid; never show an error over our own bookkeeping.
    console.error('[booking] could not finalise the paid booking:', err.message);
  }

  return Response.redirect(new URL(`/book/done?ref=${encodeURIComponent(ref)}`, request.url), 303);
}

export async function POST(request) {
  return handle(request, await readPayload(request));
}

export async function GET(request) {
  return handle(request, Object.fromEntries(new URL(request.url).searchParams.entries()));
}

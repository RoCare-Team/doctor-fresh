// "I will pay the technician instead."
//
// A booking made to be paid online sits unpaid until the money arrives. This
// is the way out of that: the visit stands and the technician takes the money
// afterwards. A booking already paid for is left alone.

import { getSession } from '@/lib/auth/session';
import { getBookingByRef, switchToPayAfter } from '@/lib/sql/service-bookings';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getSession();
  if (!session?.mobile) {
    return Response.json({ ok: false, error: 'Please sign in first.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const booking = await getBookingByRef(String(body.ref || '')).catch(() => null);

  // Only the customer whose booking it is may change how it is paid for.
  if (!booking || booking.mobile !== session.mobile) {
    return Response.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.paymentStatus === 'paid') {
    return Response.json({ ok: true, alreadyPaid: true });
  }

  await switchToPayAfter(booking.id);
  return Response.json({ ok: true });
}

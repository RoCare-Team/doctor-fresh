// Can this customer actually pay online right now?
//
// Asked by the booking page before it offers to take money. There are two ways
// a payment can happen, and the answer is yes if either is open:
//
//   gateway — this site's own payment set-up (Easebuzz, or a payment page
//             handed over to through SERVICE_PAYMENT_URL)
//   service — the service system's booking call, which answers with a payment
//             page of its own. It needs the service's ids for this customer,
//             which arrive when they sign in with an OTP.
//
// Offering a button that ends in "not set up" is worse than not offering it,
// so the page asks rather than assumes.

import { getSession } from '@/lib/auth/session';
import { onlinePaymentReady } from '@/lib/sql/easebuzz';
import { serviceIdsFor } from '@/lib/sql/service-customers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gateway = onlinePaymentReady();

  const session = await getSession();
  const { custId } = session?.mobile
    ? await serviceIdsFor(session.mobile).catch(() => ({ custId: '' }))
    : { custId: '' };

  // A cart id is not needed in advance — one is built from the basket when
  // the booking is made. Knowing who the customer is there is what matters.
  const service = Boolean(custId);

  return Response.json({
    ok: true,
    online: gateway || service,
    via: gateway ? 'gateway' : service ? 'service' : null,
    // Only ever about this visitor's own booking; nothing here is a secret,
    // and it is what tells the page which sentence to show.
    reason: gateway || service ? '' : 'not-signed-in-with-otp',
  });
}

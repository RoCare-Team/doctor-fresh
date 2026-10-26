// Easebuzz sends the visitor back here after a successful payment.
//
// The gateway POSTs a form, so the order is marked paid and the browser is
// redirected to the confirmation page — the same work easebuzz_success() does
// in Home.php. The callback is verified first (verifyEasebuzzPayment): the
// URL is public, and an unverified one is treated as a failed payment.

import { after } from 'next/server';
import {
  markPaymentSuccess, parseTxnId, verifyEasebuzzPayment,
} from '@/lib/sql/easebuzz';
import { sendOrderPlacedWhatsApp, notifyTeam } from '@/lib/whatsapp';
import { getOrder } from '@/lib/sql/orders';
import { forwardPaymentStatus } from '@/lib/services/product-lead';
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

  // Only a callback Easebuzz really signed, for this order and amount, pays it.
  const verified = await verifyEasebuzzPayment(payload).catch((err) => ({ ok: false, reason: err.message }));
  if (!verified.ok) {
    console.error(`[easebuzz] success callback rejected for order ${saleId}: ${verified.reason}`);
    const url = new URL('/cart-checkout', request.url);
    url.searchParams.set('payment', 'failed');
    return Response.redirect(url, 303);
  }

  let guestId = null;
  try {
    const result = await markPaymentSuccess({ transactionId, saleId, payload });
    guestId = result?.guestId || null;
    // Stock was held back until the payment was confirmed.
    if (saleId) await reserveStockForOrder(saleId);

    // An online order is only placed once it is paid, so this is where the
    // customer hears about it — and only the first time, not on a refresh.
    if (result && !result.wasPaid) {
      // The service system already has the order; now it hears it was paid.
      after(() => forwardPaymentStatus({ orderId: saleId, status: 'success', response: payload }));

      after(() => sendOrderPlacedWhatsApp({ name: result.name, mobile: result.mobile }));

      // The office too, with the whole order — this is the moment an online
      // order becomes real, so it is the moment worth telling them about.
      after(async () => {
        const order = saleId ? await getOrder({ saleId, asAdmin: true }).catch(() => null) : null;
        const items = order?.items || [];
        const count = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);
        const rest = items.length > 1 ? ` +${items.length - 1} more` : '';
        const where = [order?.address?.city, order?.address?.c_pincode || order?.address?.zip]
          .filter(Boolean).join(' ');

        await notifyTeam({
          what: `Paid order #${order?.code || saleId || ''}`,
          name: result.name,
          mobile: result.mobile,
          email: order?.address?.email || '',
          detail: `Paid online, Rs ${order?.totals?.grandTotal ?? 0} — ${count} item(s): ${items[0]?.name || 'order'}${rest}${where ? ` — ${where}` : ''}`,
        });
      });
    }
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

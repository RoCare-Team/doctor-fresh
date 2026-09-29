// Filing a booking with the service system, with everything it needs in one
// call: who, where, when, and which basket.
//
//   add_lead_with_full_dtls.php
//     → { cust_id, cust_mobile, address_id, cust_email, cart_id,
//         appointment_time, appointment_date, source }
//     ← { lead_id_for_payment: "<payment page url>", … }
//
// This is the call the service's own site makes, and the reason to prefer it
// over the older wizard booking: it answers with a payment page of the
// service's own, so a customer can pay online without this site holding any
// gateway credentials at all.
//
// It needs three ids that belong to the service, not to us — the customer, the
// address and the cart. Without all three the older booking is used instead,
// which is why nothing here ever throws: a missing id must cost a payment
// option, never the booking.

const LEAD_URL = process.env.SERVICE_LEAD_URL
  || process.env.NEXT_PUBLIC_API_GENERATE_LEAD
  || 'https://waterpurifierservicecenter.in/customer/ro_customer/add_lead_with_full_dtls.php';

// Which site the lead came from, as it will read in their panel.
const SOURCE = process.env.SERVICE_LEAD_SOURCE || 'doctorfresh website';

const DEBUG = process.env.OTP_DEBUG === '1' || process.env.NODE_ENV !== 'production';

/** Whether this booking has the three service ids the call needs. */
export function fullLeadReady({ custId, addressId, cartId }) {
  return Boolean(String(custId || '').trim() && String(addressId || '').trim() && String(cartId || '').trim());
}

/**
 * Files the booking. Returns `{ ok, paymentUrl, leadId }`, or `{ ok: false }`
 * with a reason the caller can fall back from.
 */
export async function createFullLead({
  custId, mobile, addressId, email, cartId, date, slot, returnUrl = '',
}) {
  const payload = {
    cust_id: String(custId),
    cust_mobile: String(mobile),
    address_id: String(addressId),
    cust_email: String(email || ''),
    cart_id: String(cartId),
    appointment_time: String(slot || ''),
    appointment_date: String(date || ''),
    source: SOURCE,
    // Asked for, not relied on: their payment page returns to their own
    // response.php unless their script happens to honour one of these.
    ...(returnUrl ? {
      surl: returnUrl, furl: returnUrl, return_url: returnUrl, redirect_url: returnUrl,
    } : {}),
  };

  if (DEBUG) console.info('[lead] → payload', JSON.stringify(payload));

  let text;
  let status;
  try {
    const res = await fetch(LEAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
    text = await res.text();
  } catch (err) {
    console.error('[lead] could not reach the service:', err.message);
    return { ok: false, reason: 'Could not reach the booking service.' };
  }

  if (DEBUG) console.info(`[lead] ← ${status}`, String(text).slice(0, 400));

  let data;
  try {
    // Their PHP puts a blank line before the JSON often enough to matter.
    data = JSON.parse(String(text).trim());
  } catch {
    console.error('[lead] unreadable answer:', String(text).slice(0, 200));
    return { ok: false, reason: 'The booking service returned an unexpected answer.' };
  }

  if (data?.error) {
    return { ok: false, reason: data.message || data.msg || 'The booking could not be created.' };
  }

  // The field is named for the payment but holds a URL, not an id.
  const paymentUrl = String(data?.lead_id_for_payment || '').trim();

  return {
    ok: true,
    paymentUrl: /^https?:\/\//i.test(paymentUrl) ? paymentUrl : '',
    leadId: String(data?.lead_id || data?.leadId || paymentUrl || '').slice(0, 80),
  };
}

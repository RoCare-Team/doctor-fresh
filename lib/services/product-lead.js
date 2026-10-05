// A placed order, forwarded to the service system as a product lead.
//
//   get_doctorfresh_product_lead.php
//     → { address: { name, mobile, email, c_pincode, city, state, house_no,
//                    area, near_by, message },
//         items: [{ id, qty }], coupon, payment }
//
// The order is written to this site's own database first — that is the record
// of the sale. This is the copy for the team that works out of the service
// system's panel, sent after the customer has been answered: a slow or broken
// forward must never cost us the order itself.

const URL_ = process.env.PRODUCT_LEAD_URL
  || 'https://inet.waterpurifierservicecenter.in/get_doctorfresh_product_lead.php';

const DEBUG = process.env.OTP_DEBUG === '1' || process.env.NODE_ENV !== 'production';

const text = (v, max) => String(v ?? '').trim().slice(0, max);

/** Forwards one order. Never throws: the caller has already replied. */
export async function forwardProductLead({
  address = {}, items = [], coupon = '', payment = '',
}) {
  const payload = {
    address: {
      name: text(address.name, 120),
      mobile: String(address.mobile || '').replace(/\D/g, '').slice(-10),
      email: text(address.email, 160),
      c_pincode: text(address.c_pincode, 6),
      city: text(address.city, 80),
      state: text(address.state, 80),
      house_no: text(address.house_no, 200),
      area: text(address.area, 200),
      near_by: text(address.near_by, 200),
      message: text(address.message, 1000),
    },
    items: items
      .map((i) => ({ id: Number(i.id), qty: Number(i.qty) || 1 }))
      .filter((i) => i.id > 0),
    coupon: text(coupon, 40),
    payment: text(payment, 40),
  };

  if (DEBUG) console.info('[product-lead] → payload', JSON.stringify(payload));

  let body;
  let status;
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    status = res.status;
    body = String(await res.text());
  } catch (err) {
    console.error('[product-lead] could not reach the service:', err.message);
    return { ok: false };
  }

  if (DEBUG) console.info(`[product-lead] ← ${status}`, body.slice(0, 300));

  try {
    // Scripts on that host may print text around the JSON, so the answer is
    // cut out of the reply rather than parsed whole.
    const data = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1));
    if (data?.error || data?.success === false || data?.status === false) {
      console.error('[product-lead] refused:', data.message || data.msg || '', data.errors ? JSON.stringify(data.errors) : '');
      return { ok: false };
    }
    return { ok: true };
  } catch {
    return { ok: status >= 200 && status < 300 };
  }
}

// Online payment through Easebuzz.
//
// The site already has a working initiation endpoint — `easebuzz.php` on the
// PHP host, which holds the merchant key and salt. Home.php posts a form to it
// and Easebuzz answers with a hosted payment page; the same endpoint is called
// here rather than re-implementing the integration with credentials this app
// does not have.
//
//   POST /easebuzz.php?api_name=initiate_payment
//        txnid, amount, firstname, email, phone, productinfo, udf1, surl, furl
//   → <script>window.location = 'https://pay.easebuzz.in/pay/<access key>'</script>
//
// Attempts are tracked in `payment_transactions`, the table the PHP checkout
// writes, so both sites report from the same place.

import { mutate, queryOne } from '@/lib/db';

const INITIATE_URL = process.env.EASEBUZZ_INITIATE_URL
  || 'https://www.doctorfresh.in/easebuzz.php?api_name=initiate_payment';

/** Records the attempt and returns its id, which becomes part of the txnid. */
export async function createPaymentTransaction({ saleId, userId, gateway, amount }) {
  const result = await mutate(
    `INSERT INTO \`payment_transactions\`
       (\`order_id\`, \`user_id\`, \`gateway\`, \`amount\`, \`status\`, \`created_at\`)
     VALUES (?, ?, ?, ?, 'in-process', NOW())`,
    [saleId || 0, userId || null, gateway, Number(amount).toFixed(2)],
  );
  return result.insertId;
}

/**
 * Asks the PHP endpoint to start a payment and returns the hosted page to send
 * the visitor to.
 *
 * `txnid` keeps the `<id>doctorfresh` shape the existing integration uses, and
 * `udf1` carries the sale id back on the callback — that is how the PHP
 * success handler finds the order, so it must stay the same.
 */
export async function initiateEasebuzz({ transactionId, saleId, amount, name, email, phone, successUrl, failureUrl }) {
  const form = new URLSearchParams({
    txnid: `${transactionId}doctorfresh`,
    // The endpoint rejects an integer: "The amount should float up to two or
    // one decimal."
    amount: Number(amount).toFixed(2),
    firstname: name,
    email: email || 'care@doctorfresh.in',
    phone,
    productinfo: 'RO Care India',
    udf1: String(saleId),
    unique_id: String(saleId),
    surl: successUrl,
    furl: failureUrl,
  });

  let text;
  try {
    const response = await fetch(INITIATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    text = await response.text();
  } catch (err) {
    return { error: `Could not reach the payment gateway (${err.message}).` };
  }

  // Success is a script that redirects to the hosted page.
  const redirect = text.match(/window\.location\s*=\s*'([^']+)'/)?.[1]
    || text.match(/window\.location\s*=\s*"([^"]+)"/)?.[1];
  if (redirect) return { redirect };

  // Failure comes back as JSON: {"status":0,"data":"…"}
  try {
    const data = JSON.parse(text);
    if (data?.data) return { error: String(data.data) };
  } catch { /* not JSON — fall through to the generic message */ }

  return { error: 'The payment gateway did not start a payment. Please try again.' };
}

/* ------------------------------------------------------------- callbacks */

/** `<id>doctorfresh` → the numeric transaction id. */
export function parseTxnId(txnid) {
  const id = Number(String(txnid ?? '').replace(/doctorfresh$/i, ''));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function markPaymentFailed(transactionId, payload) {
  if (!transactionId) return;
  await mutate(
    'UPDATE `payment_transactions` SET `status` = ?, `payload` = ?, `updated_at` = NOW() WHERE `id` = ?',
    ['failed', JSON.stringify(payload).slice(0, 60_000), transactionId],
  );
}

/**
 * Marks the attempt and the order paid, matching what easebuzz_success() does
 * in Home.php: the transaction row, then the sale's payment_status.
 */
export async function markPaymentSuccess({ transactionId, saleId, payload }) {
  if (transactionId) {
    await mutate(
      `UPDATE \`payment_transactions\`
          SET \`status\` = 'success', \`payload\` = ?, \`gateway_transaction_id\` = ?,
              \`order_id\` = ?, \`updated_at\` = NOW()
        WHERE \`id\` = ?`,
      [
        JSON.stringify(payload).slice(0, 60_000),
        String(payload?.easepayid || payload?.txnid || '').slice(0, 255),
        saleId || 0,
        transactionId,
      ],
    );
  }

  if (!saleId) return null;

  const sale = await queryOne('SELECT `payment_status`, `guest_id` FROM `sale` WHERE `sale_id` = ? LIMIT 1', [saleId]);
  if (!sale) return null;

  let status;
  try {
    status = JSON.parse(sale.payment_status || '[]');
  } catch {
    status = [];
  }
  status = status.length ? status.map((s) => ({ ...s, status: 'paid' })) : [{ admin: '', status: 'paid' }];

  await mutate(
    'UPDATE `sale` SET `payment_status` = ?, `payment_timestamp` = ? WHERE `sale_id` = ?',
    [JSON.stringify(status), String(Math.floor(Date.now() / 1000)), saleId],
  );

  return { guestId: sale.guest_id };
}

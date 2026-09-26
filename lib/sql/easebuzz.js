// Online payment through Easebuzz.
//
// Payments are started with Easebuzz directly: EASEBUZZ_KEY and EASEBUZZ_SALT
// sign the request, Easebuzz answers with an access key, and the customer is
// sent to its hosted page. `EASEBUZZ_ENV=test` uses the sandbox.
//
// The old site did this through `easebuzz.php` on the PHP host, which held
// the credentials. That host is gone — doctorfresh.in is this app now, and the
// file answers 405 — so the integration lives here. Setting
// EASEBUZZ_INITIATE_URL puts the old path back, should the PHP site return.
//
// Attempts are tracked in `payment_transactions`, the table the PHP checkout
// wrote, so both sites report from the same place.

import crypto from 'node:crypto';
import { mutate, queryOne } from '@/lib/db';

const INITIATE_URL = process.env.EASEBUZZ_INITIATE_URL || '';
const KEY = process.env.EASEBUZZ_KEY || '';
const SALT = process.env.EASEBUZZ_SALT || '';
const SANDBOX = String(process.env.EASEBUZZ_ENV || 'prod').toLowerCase() === 'test';
const HOST = SANDBOX ? 'https://testpay.easebuzz.in' : 'https://pay.easebuzz.in';

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
export async function initiateEasebuzz({
  transactionId, saleId, amount, name, email, phone, successUrl, failureUrl,
}) {
  const fields = {
    txnid: `${transactionId}doctorfresh`,
    // Easebuzz rejects a bare integer: "The amount should float up to two or
    // one decimal."
    amount: Number(amount).toFixed(2),
    firstname: String(name || 'Customer').slice(0, 60),
    email: email || 'care@doctorfresh.in',
    phone: String(phone || '').slice(0, 15),
    productinfo: 'RO Care India',
    // What the callback reads the order or booking back from.
    udf1: String(saleId),
    surl: successUrl,
    furl: failureUrl,
  };

  // The PHP host, when it is still there and configured.
  if (INITIATE_URL) return viaPhpHost(fields);

  if (!KEY || !SALT) {
    console.error('[easebuzz] EASEBUZZ_KEY / EASEBUZZ_SALT are not set');
    return { error: 'Online payment is not set up yet. Please choose to pay after the service.' };
  }

  // hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1…udf10|salt)
  const udf = [fields.udf1, '', '', '', '', '', '', '', '', ''];
  const hash = crypto.createHash('sha512').update(
    [KEY, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email, ...udf, SALT].join('|'),
  ).digest('hex');

  const form = new URLSearchParams({ ...fields, key: KEY, hash });

  let data;
  try {
    const response = await fetch(`${HOST}/payment/initiateLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    data = await response.json();
  } catch (err) {
    return { error: `Could not reach the payment gateway (${err.message}).` };
  }

  // { status: 1, data: "<access key>" } on success; on failure `data` holds
  // the reason, sometimes as an object of field errors.
  if (data?.status === 1 && typeof data.data === 'string') {
    return { redirect: `${HOST}/pay/${data.data}` };
  }

  // Easebuzz puts the useful line in error_desc and a summary in data.
  const reason = data?.error_desc
    || (typeof data?.data === 'string' ? data.data : Object.values(data?.data || {}).flat().join(' '));
  console.error('[easebuzz] initiation refused:', reason || JSON.stringify(data).slice(0, 200));
  return { error: reason || 'The payment gateway did not start a payment. Please try again.' };
}

/** The old route: a PHP page that held the credentials and answered with a script. */
async function viaPhpHost(fields) {
  let text;
  try {
    const response = await fetch(INITIATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...fields, unique_id: fields.udf1 }),
      signal: AbortSignal.timeout(20_000),
    });
    text = await response.text();
  } catch (err) {
    return { error: `Could not reach the payment gateway (${err.message}).` };
  }

  const redirect = text.match(/window\.location\s*=\s*'([^']+)'/)?.[1]
    || text.match(/window\.location\s*=\s*"([^"]+)"/)?.[1];
  if (redirect) return { redirect };

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

  const sale = await queryOne(
    'SELECT `payment_status`, `guest_id`, `shipping_address` FROM `sale` WHERE `sale_id` = ? LIMIT 1',
    [saleId],
  );
  if (!sale) return null;

  let status;
  try {
    status = JSON.parse(sale.payment_status || '[]');
  } catch {
    status = [];
  }
  // The gateway can return the customer here more than once (a refresh, a
  // retried POST). Anything that should happen once per paid order — the
  // WhatsApp confirmation — keys off this.
  const wasPaid = status.length > 0 && status.every((s) => s.status === 'paid');
  status = status.length ? status.map((s) => ({ ...s, status: 'paid' })) : [{ admin: '', status: 'paid' }];

  await mutate(
    'UPDATE `sale` SET `payment_status` = ?, `payment_timestamp` = ? WHERE `sale_id` = ?',
    [JSON.stringify(status), String(Math.floor(Date.now() / 1000)), saleId],
  );

  let address = {};
  try {
    address = JSON.parse(sale.shipping_address || '{}');
  } catch { /* no contact details to confirm to */ }

  return {
    guestId: sale.guest_id,
    wasPaid,
    name: address.name || [address.firstname, address.lastname].filter(Boolean).join(' '),
    mobile: address.mobile || address.phone,
  };
}

// One-time passcodes, issued and checked by the shared RO Care OTP service.
//
//   send    POST { phoneNumber }           + header X-App-Token
//           → {"error":false,"msg":"OTP Sent Successfully! …"}
//   verify  POST { phoneNumber, newOtp }   (no token)
//           → {"error":false,…} | {"error":true,"msg":"Otp does not match!"}
//
// The code itself never reaches this app: the service generates it, sends the
// SMS and checks it. That means there is nothing here for an attacker to read,
// and nothing to keep in step with the database.
//
// Both endpoints answer HTTP 200 whatever happens and put the verdict in
// `error`, so the body is what is trusted, never the status code.
//
// Requests are still rate-limited here — the service does not promise to, and
// a resend button should not be able to spray messages at a number.

const SEND_URL = process.env.OTP_SEND_URL
  || process.env.NEXT_PUBLIC_API_SEND_OTP
  || 'https://waterpurifierservicecenter.in/customer/ro_customer/roservice_sendotp.php';

const VERIFY_URL = process.env.OTP_VERIFY_URL
  || process.env.NEXT_PUBLIC_API_VERIFY_OTP
  || 'https://waterpurifierservicecenter.in/customer/ro_customer/service_otp_verify.php';

// Server-side only — this must never be exposed to the browser.
const TOKEN = process.env.OTP_TOKEN || '';

const RESEND_GAP_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

// Held on globalThis: each route handler is bundled separately, so a plain
// module-level Map would give request-otp and verify-otp their own copy.
const globalForOtp = globalThis;
const store = (globalForOtp.__dfOtp ??= {});
store.issued ??= new Map();
store.attempts ??= new Map();
const { issued, attempts } = store;

function history(mobile) {
  const now = Date.now();
  const list = (issued.get(mobile) || []).filter((t) => now - t < 60 * 60 * 1000);
  issued.set(mobile, list);
  return list;
}

/** Why a new code cannot be sent right now, or null when it can. */
export function throttleReason(mobile) {
  const list = history(mobile);
  const last = list[list.length - 1];

  if (last && Date.now() - last < RESEND_GAP_MS) {
    const seconds = Math.ceil((RESEND_GAP_MS - (Date.now() - last)) / 1000);
    return `Please wait ${seconds} seconds before asking for another code.`;
  }
  if (list.length >= MAX_PER_HOUR) {
    return 'Too many codes requested for this number. Please try again in an hour.';
  }
  return null;
}

/** POSTs JSON and reads the service's `{ error, msg }` answer. */
async function call(url, body, headers = {}) {
  let text;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    text = await response.text();
  } catch (err) {
    return { ok: false, message: `Could not reach the OTP service (${err.message}).` };
  }

  try {
    const data = JSON.parse(text);
    return {
      ok: data?.error === false,
      message: data?.msg || '',
      data,
    };
  } catch {
    return { ok: false, message: 'The OTP service returned an unexpected response.' };
  }
}

/**
 * Asks the service to send a code. Returns { ok } or { ok: false, reason }.
 */
export async function sendOtp(mobile) {
  if (!TOKEN) {
    console.error('[otp] OTP_TOKEN is not set — the service will refuse the request');
    return { ok: false, reason: 'Sign-in is not configured. Please call +91-9311587716.' };
  }

  const result = await call(SEND_URL, { phoneNumber: mobile }, { 'X-App-Token': TOKEN });

  if (!result.ok) {
    console.error('[otp] send refused:', result.message);
    return { ok: false, reason: result.message || 'Could not send the code. Please try again.' };
  }

  history(mobile).push(Date.now());
  attempts.delete(mobile);
  return { ok: true };
}

/**
 * Checks a code with the service. Returns { ok } or { ok: false, reason }.
 *
 * Attempts are counted here so a wrong code cannot be brute-forced through the
 * service, which has no attempt limit of its own.
 */
export async function verifyOtp(mobile, input) {
  const code = String(input ?? '').replace(/\D/g, '');
  if (!code) return { ok: false, reason: 'Enter the code we sent you.' };

  const tries = (attempts.get(mobile) || 0) + 1;
  attempts.set(mobile, tries);
  if (tries > MAX_ATTEMPTS) {
    return { ok: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  const result = await call(VERIFY_URL, { phoneNumber: mobile, newOtp: code });

  if (!result.ok) {
    const left = MAX_ATTEMPTS - tries;
    const reason = /not match/i.test(result.message) && left > 0
      ? `Incorrect code. ${left} attempt(s) left.`
      : result.message || 'That code could not be verified.';
    return { ok: false, reason };
  }

  attempts.delete(mobile);
  return { ok: true };
}

export { MAX_ATTEMPTS };

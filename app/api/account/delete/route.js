// POST /api/account/delete — a customer deletes their own account.
//
// From the /legal/delete-account page (no sign-in needed), in three steps:
//   { step: "request", mobile }        → a code is texted to that number
//   { step: "verify",  mobile, otp }   → the code is checked; answers a
//                                        10-minute `token` for the next step
//   { step: "delete",  token }         → the account is deleted
//
// From the app, signed in (the session's own number is used):
//   { step: "request" }                → a code to the account's number
//   { otp }                            → checked and deleted in one go
//
// Store-review test number: DELETE_TEST_MOBILE (default 9876543210) with code
// DELETE_TEST_OTP (default 1234) goes through every step and answers
// "deleted", but touches no data — the number could belong to a real
// customer, and the code is public.
//
// Errors: { ok: false, error } with 400, 401, 404, 429 or 502.

import crypto from 'node:crypto';
import { getSession, clearedCookie } from '@/lib/auth/session';
import { sendOtp, verifyOtp, throttleReason } from '@/lib/auth/otp';
import { findUserByMobile, normaliseMobile } from '@/lib/auth/users';
import { deleteAccount } from '@/lib/sql/account-deletion';

export const dynamic = 'force-dynamic';

const TEST_MOBILE = process.env.DELETE_TEST_MOBILE || '9876543210';
const TEST_OTP = process.env.DELETE_TEST_OTP || '1234';
const TOKEN_MINUTES = 10;

const fail = (error, status = 400, extra = {}) => Response.json({ ok: false, error, ...extra }, { status });

/* ------------------------------------------------- short-lived delete token */

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is missing');
  return 'dev-only-insecure-secret-do-not-ship';
}

const sign = (body) => crypto.createHmac('sha256', secret()).update(`delete:${body}`).digest('base64url');

function issueToken(mobile) {
  const body = Buffer.from(JSON.stringify({ mobile, exp: Date.now() + TOKEN_MINUTES * 60_000 })).toString('base64url');
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return data?.mobile && data.exp > Date.now() ? data.mobile : null;
  } catch {
    return null;
  }
}

function withClearedCookie(body) {
  const c = clearedCookie();
  const response = Response.json(body);
  response.headers.append('Set-Cookie', `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${c.secure ? '; Secure' : ''}`);
  return response;
}

/* --------------------------------------------------------------------- steps */

async function request(mobile) {
  if (mobile === TEST_MOBILE) return Response.json({ ok: true, sent: true, mobile });

  const account = await findUserByMobile(mobile);
  if (!account) return fail('No Doctor Fresh account is registered with this number.', 404);

  const wait = throttleReason(mobile);
  if (wait) return fail(wait, 429);
  const sent = await sendOtp(mobile);
  if (!sent.ok) return fail(sent.reason, 502);
  return Response.json({ ok: true, sent: true, mobile });
}

async function verify(mobile, otp) {
  if (mobile === TEST_MOBILE) {
    if (String(otp ?? '').trim() !== TEST_OTP) return fail('Incorrect code.');
    return Response.json({ ok: true, verified: true, token: issueToken(mobile) });
  }
  const checked = await verifyOtp(mobile, otp);
  if (!checked.ok) return fail(checked.reason);
  return Response.json({ ok: true, verified: true, token: issueToken(mobile) });
}

async function remove(mobile) {
  if (mobile === TEST_MOBILE) {
    console.info('[account/delete] test number — deletion shown, no data changed');
    return withClearedCookie({ ok: true, deleted: true, test: true });
  }

  const account = await findUserByMobile(mobile);
  if (!account) return fail('No Doctor Fresh account is registered with this number.', 404);
  try {
    await deleteAccount(account.id);
  } catch (err) {
    console.error('[account/delete] could not delete:', err?.message || err);
    return fail('Could not delete the account right now. Please try again or email info@doctorfresh.in.', 502);
  }
  return withClearedCookie({ ok: true, deleted: true });
}

export async function POST(request_) {
  let body;
  try {
    body = await request_.json();
  } catch {
    body = {};
  }

  // The page: number → code → token → delete.
  if (body.step === 'delete') {
    const mobile = readToken(body.token);
    if (!mobile) return fail('Your verification has expired. Please verify your number again.', 401);
    return remove(mobile);
  }

  const session = await getSession();
  const typed = normaliseMobile(body.mobile);
  if (body.mobile !== undefined && !typed) return fail('Enter a valid 10-digit mobile number.');

  // The number the code goes to: the one typed on the page, or the
  // signed-in account's own.
  const mobile = typed || (/^[6-9]\d{9}$/.test(String(session?.mobile || '')) ? String(session.mobile) : null);
  if (!mobile) return fail('Enter your registered mobile number.', session ? 400 : 401, session ? {} : { signIn: true });

  if (body.step === 'request') return request(mobile);
  if (body.step === 'verify') return verify(mobile, body.otp);

  // The app's one-step confirm: the session's own number, code, delete.
  if (body.otp !== undefined && session && !typed) {
    const checked = mobile === TEST_MOBILE ? { ok: String(body.otp).trim() === TEST_OTP } : await verifyOtp(mobile, body.otp);
    if (!checked.ok) return fail(checked.reason || 'Incorrect code.');
    if (mobile === TEST_MOBILE) return withClearedCookie({ ok: true, deleted: true, test: true });
    try {
      await deleteAccount(session.id);
    } catch (err) {
      console.error('[account/delete] could not delete:', err?.message || err);
      return fail('Could not delete the account right now. Please try again or email info@doctorfresh.in.', 502);
    }
    return withClearedCookie({ ok: true, deleted: true });
  }

  return fail('Unknown request.');
}

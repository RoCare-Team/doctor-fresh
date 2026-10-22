// POST /api/account/delete — the signed-in customer deletes their own
// account (the in-app path Google Play requires; the web path is the
// /legal/delete-account page).
//
// Two steps, so a borrowed phone with a signed-in app cannot do it alone:
//   { "step": "request" }   → a code is texted to the account's number
//   { "otp": "123456" }     → the code is checked and the account deleted
//
// Answers { ok: true, sent: true } / { ok: true, deleted: true }, or
// { ok: false, error } with 400, 401 (signed out), 429 (too many codes) or 502.

import { getSession, clearedCookie } from '@/lib/auth/session';
import { sendOtp, verifyOtp, throttleReason } from '@/lib/auth/otp';
import { deleteAccount } from '@/lib/sql/account-deletion';

export const dynamic = 'force-dynamic';

const fail = (error, status = 400, extra = {}) => Response.json({ ok: false, error, ...extra }, { status });

export async function POST(request) {
  const session = await getSession();
  if (!session) return fail('Please sign in to delete your account.', 401, { signIn: true });

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const mobile = String(session.mobile || '');
  if (!/^[6-9]\d{9}$/.test(mobile)) return fail('This account has no mobile number to verify. Please email info@doctorfresh.in.');

  if (body.step === 'request') {
    const wait = throttleReason(mobile);
    if (wait) return fail(wait, 429);
    const sent = await sendOtp(mobile);
    if (!sent.ok) return fail(sent.reason, 502);
    return Response.json({ ok: true, sent: true, mobile });
  }

  const checked = await verifyOtp(mobile, body.otp);
  if (!checked.ok) return fail(checked.reason);

  try {
    await deleteAccount(session.id);
  } catch (err) {
    console.error('[account/delete] could not delete:', err?.message || err);
    return fail('Could not delete the account right now. Please try again or email info@doctorfresh.in.', 502);
  }

  const c = clearedCookie();
  const response = Response.json({ ok: true, deleted: true });
  response.headers.append('Set-Cookie', `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${c.secure ? '; Secure' : ''}`);
  return response;
}

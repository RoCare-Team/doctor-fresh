// Step two: check the code, create or complete the account, start the session.

import { isDbEnabled } from '@/lib/db';
import {
  normaliseMobile, normaliseName, normaliseEmail,
  findUserByMobile, createOrUpdateUser, markSignedIn,
} from '@/lib/auth/users';
import { verifyOtp } from '@/lib/auth/otp';
import { sessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Accounts are unavailable right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const existing = await findUserByMobile(mobile);
  const result = await verifyOtp(mobile, body.otp);
  if (!result.ok) return fail(result.reason);

  let user;
  try {
    if (body.mode === 'register') {
      const name = normaliseName(body.name);
      const email = normaliseEmail(body.email);
      if (!name) return fail('Enter your full name.');
      if (!email) return fail('Enter a valid email address.');
      user = await createOrUpdateUser({ mobile, name, email });
    } else {
      if (!existing) return fail('No account found for this number.');
      user = existing;
      await markSignedIn(user.id);
    }
  } catch {
    return fail('Could not complete sign-in. Please try again.', 502);
  }

  const response = Response.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name || '',
      mobile: user.phone || mobile,
      email: user.email || '',
    },
  });
  response.headers.append('Set-Cookie', serialiseCookie(sessionCookie({
    id: user.id, name: user.name, mobile: user.phone || mobile,
  })));
  return response;
}

/** Response.json() has no cookie helper, so the header is built here. */
function serialiseCookie(c) {
  const parts = [`${c.name}=${c.value}`, `Path=${c.path}`, `Max-Age=${c.maxAge}`, 'SameSite=Lax'];
  if (c.httpOnly) parts.push('HttpOnly');
  if (c.secure) parts.push('Secure');
  return parts.join('; ');
}

// Step two: check the code, create or complete the account, start the session.

import { isDbEnabled } from '@/lib/db';
import {
  normaliseMobile, normaliseName, normaliseEmail,
  findUserByMobile, createOrUpdateUser, markSignedIn,
} from '@/lib/auth/users';
import { verifyOtp } from '@/lib/auth/otp';
import { normaliseAddresses } from '@/lib/services/addresses';
import { rememberAddresses } from '@/lib/sql/customer-addresses';
import { rememberServiceIds } from '@/lib/sql/service-customers';
import { sessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

// What the browser sent, printed beside what the OTP service is then asked.
const DEBUG = process.env.OTP_DEBUG === '1' || process.env.NODE_ENV !== 'production';

export async function POST(request) {
  if (!isDbEnabled()) return fail('Accounts are unavailable right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  if (DEBUG) console.info('[verify-otp] payload from the browser', JSON.stringify(body));

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit mobile number.');

  const existing = await findUserByMobile(mobile);
  const result = await verifyOtp(mobile, body.otp);
  if (!result.ok) return fail(result.reason);

  let user;
  try {
    if (body.mode === 'book') {
      // Signed in by number: the row is created on the spot if this is their
      // first booking, with the name filled in later from the booking form.
      user = existing || await createOrUpdateUser({ mobile });
    } else if (body.mode === 'register') {
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

  // What the OTP service knows about this customer: the addresses they have
  // had a technician to before, so a booking does not ask for one they have
  // already given us. Held by the browser, never written to our own tables.
  const addresses = normaliseAddresses(result.data?.address);
  if (DEBUG) console.info(`[verify-otp] ${addresses.length} saved address(es) from the service`);
  if (addresses.length) await rememberAddresses(mobile, addresses).catch(() => {});

  // The service's own ids for this customer: a booking is filed against them,
  // and this answer is the only place they are ever handed over.
  const cart = (Array.isArray(result.data?.AllCartDetails) ? result.data.AllCartDetails : [])
    .find((c) => c?.category_cart_id);
  if (result.data?.c_id || cart) {
    if (DEBUG) console.info(`[verify-otp] service ids — customer ${result.data?.c_id || '—'}, cart ${cart?.category_cart_id || '—'}`);
    await rememberServiceIds(mobile, {
      custId: result.data?.c_id,
      cartId: cart?.category_cart_id,
    }).catch(() => {});
  }

  const response = Response.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name || result.data?.name || '',
      mobile: user.phone || mobile,
      email: user.email || result.data?.email || '',
    },
    addresses,
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

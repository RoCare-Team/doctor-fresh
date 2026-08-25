// Step one of sign-in and registration: issue a code to a mobile number.

import { isDbEnabled } from '@/lib/db';
import {
  normaliseMobile, normaliseName, normaliseEmail, findUserByMobile, findUserByEmail,
} from '@/lib/auth/users';
import { sendOtp, throttleReason } from '@/lib/auth/otp';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  if (!isDbEnabled()) return fail('Accounts are unavailable right now. Please call +91-9311587716.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const register = body.mode === 'register';
  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Enter a valid 10-digit Indian mobile number.');

  const existing = await findUserByMobile(mobile);

  if (register) {
    // Name and email are checked before a code is sent, so nobody reads an SMS
    // only to be told their email was malformed.
    if (!normaliseName(body.name)) return fail('Enter your full name.');

    const email = normaliseEmail(body.email);
    if (email === null) return fail('Enter a valid email address.');
    if (!email) return fail('Enter your email address.');

    const byEmail = await findUserByEmail(email);
    if (byEmail && byEmail.phone !== mobile) {
      return fail('That email is already used by another account.');
    }
    // A row with no name is an OTP-only account from the old site; registering
    // completes it rather than being rejected as a duplicate.
    if (existing?.name) {
      return fail('This number is already registered. Please sign in instead.');
    }
  } else if (!existing) {
    return fail('No account found for this number. Please create an account first.');
  }

  const throttled = throttleReason(mobile);
  if (throttled) return fail(throttled, 429);

  const delivery = await sendOtp(mobile);
  if (!delivery.ok) return fail(delivery.reason, 502);

  return Response.json({ ok: true, mobile });
}

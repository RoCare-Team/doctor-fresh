// The code their system texts after a service request is filed.
//
// Theirs is the only side that knows the code, so this is a thin pass-through:
// the number and the six digits go to the same AddLead_new.php the request
// went to, with check=yesotp, and only their "yes" counts as verified.

import { verifyLeadOtp } from '@/lib/wizard';
import { normaliseMobile } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const mobile = normaliseMobile(body.mobile);
  if (!mobile) return fail('Please enter a valid 10-digit mobile number.');

  const otp = String(body.otp || '').replace(/\D/g, '');
  if (otp.length < 4) return fail('Enter the code from the message.');

  let verified;
  try {
    verified = await verifyLeadOtp({ mobile, otp });
  } catch (err) {
    console.error('[wizard] could not verify the code:', err.message);
    return fail('Could not check that code. Please try again.', 502);
  }

  if (!verified) return fail('That code did not match. Please check the message and try again.');

  return Response.json({ ok: true });
}

// The signed-in customer's own profile.

import { getSession } from '@/lib/auth/session';
import { getProfile, updateProfile } from '@/lib/sql/account';
import { normaliseEmail, normaliseName, findUserByEmail } from '@/lib/auth/users';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function GET() {
  const session = await getSession();
  if (!session) return fail('Please sign in.', 401);

  const profile = await getProfile(session.id);
  return profile ? Response.json({ ok: true, profile }) : fail('Account not found.', 404);
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session) return fail('Please sign in.', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const firstName = normaliseName(body.username);
  if (!firstName) return fail('Enter your first name.');

  const email = normaliseEmail(body.email);
  if (email === null) return fail('Enter a valid email address.');

  // An email may only belong to one account, the same rule the PHP
  // registration enforces.
  if (email) {
    const owner = await findUserByEmail(email);
    if (owner && Number(owner.id) !== Number(session.id)) {
      return fail('That email is already used by another account.');
    }
  }

  const zip = String(body.zip ?? '').trim();
  if (zip && !/^\d{6}$/.test(zip)) return fail('Enter a valid 6-digit pin code.');

  try {
    await updateProfile(session.id, {
      username: firstName,
      surname: body.surname,
      email,
      address1: body.address1,
      address2: body.address2,
      city: body.city,
      state: body.state,
      country: body.country,
      zip,
    });
  } catch (err) {
    console.error('[account] could not save the profile:', err.message);
    return fail('Could not save your details. Please try again.', 502);
  }

  return Response.json({ ok: true, profile: await getProfile(session.id) });
}

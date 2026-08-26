// Admin sign-in with the email and password already on the `admin` row.
//
// The PHP panel hashes those passwords with SHA-1, so the existing passwords
// keep working and nothing has to be reset.

import { isDbEnabled } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/sql/admin';
import { adminCookie, cookieHeader } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

// A few failures in a row from one address slow the next attempt down, so a
// password cannot be guessed at speed.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

const globalForLogin = globalThis;
const attempts = (globalForLogin.__dfAdminLogin ??= new Map());

function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, list);
  return list.length >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  attempts.get(key)?.push(Date.now()) ?? attempts.set(key, [Date.now()]);
}

export async function POST(request) {
  if (!isDbEnabled()) return fail('The admin area is unavailable right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) return fail('Enter your email and password.');

  const key = request.headers.get('x-forwarded-for') || 'local';
  if (tooManyAttempts(key)) return fail('Too many attempts. Please try again in a few minutes.', 429);

  const admin = await verifyAdminPassword(email, password);
  if (!admin) {
    recordFailure(key);
    // The same message either way, so a valid email cannot be discovered.
    return fail('Incorrect email or password.', 401);
  }

  attempts.delete(key);

  const response = Response.json({ ok: true, admin: { name: admin.name, email: admin.email } });
  response.headers.append('Set-Cookie', cookieHeader(adminCookie(admin)));
  return response;
}

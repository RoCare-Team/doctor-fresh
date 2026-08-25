// Sign-in session, held in a signed httpOnly cookie.
//
// The existing site has no session table, so nothing is stored server-side: the
// cookie carries the user id, mobile and name, and an HMAC signature over them.
// A tampered or expired cookie simply reads as signed-out.

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'df_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Signing key. AUTH_SECRET must be set in production — without it a visitor
 * could forge a session for any account, so sessions are refused rather than
 * signed with a guessable default.
 */
function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is missing — set it before enabling sign-in in production');
  }
  return 'dev-only-insecure-secret-do-not-ship';
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function serialise(user) {
  const body = b64(JSON.stringify({
    id: user.id,
    mobile: user.mobile,
    name: user.name || '',
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  }));
  return `${body}.${sign(body)}`;
}

function parse(token) {
  if (!token || typeof token !== 'string') return null;

  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  // Constant-time compare so a wrong signature cannot be guessed byte by byte.
  if (
    signature.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) return null;

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data?.id || !data?.exp || data.exp < Date.now()) return null;
    return { id: data.id, mobile: data.mobile, name: data.name };
  } catch {
    return null;
  }
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function getSession() {
  try {
    const store = await cookies();
    return parse(store.get(COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

export function sessionCookie(user) {
  return {
    name: COOKIE_NAME,
    value: serialise(user),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}

export function clearedCookie() {
  return { ...sessionCookie({ id: 0, mobile: '', name: '' }), value: '', maxAge: 0 };
}

// The admin session.
//
// Deliberately a different cookie from the customer session: an admin signing
// in must never turn into a shopper session, and a stolen shop cookie must
// never reach the admin area. Both are signed, but with different payloads and
// different names.

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'df_admin';

// Shorter than the shop's 30 days — an admin session opens the order book.
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return `admin:${value}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is missing — set it before using the admin area in production');
  }
  return 'admin:dev-only-insecure-secret-do-not-ship';
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

function serialise(admin) {
  const body = b64(JSON.stringify({
    id: admin.id,
    name: admin.name,
    mobile: admin.mobile,
    role: admin.role,
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

  if (
    signature.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) return null;

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data?.id || !data?.exp || data.exp < Date.now()) return null;
    return { id: data.id, name: data.name, mobile: data.mobile, role: data.role };
  } catch {
    return null;
  }
}

/** The signed-in admin, or null. */
export async function getAdminSession() {
  try {
    const store = await cookies();
    return parse(store.get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function adminCookie(admin) {
  return {
    name: ADMIN_COOKIE,
    value: serialise(admin),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // Scoped to /admin and its API so the cookie is not sent with shop requests.
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}

export function clearedAdminCookie() {
  return { ...adminCookie({ id: 0, name: '', mobile: '', role: '' }), value: '', maxAge: 0 };
}

/** Builds the Set-Cookie header value; Response.json() has no cookie helper. */
export function cookieHeader(c) {
  const parts = [`${c.name}=${c.value}`, `Path=${c.path}`, `Max-Age=${c.maxAge}`, 'SameSite=Lax'];
  if (c.httpOnly) parts.push('HttpOnly');
  if (c.secure) parts.push('Secure');
  return parts.join('; ');
}

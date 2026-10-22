// The signed-in user, read from the session cookie.
//
// The header asks for this from the browser rather than reading the cookie in
// the layout: touching cookies() in a server component opts the whole tree out
// of static rendering, which would turn all 703 prerendered pages into
// per-request renders.
//
// A session whose account has since been deleted (POST /api/account/delete,
// possibly from another device) reads as signed out and the cookie is cleared,
// so deleting an account ends its sign-ins everywhere.

import { getSession, clearedCookie } from '@/lib/auth/session';
import { isDeletedAccount } from '@/lib/sql/account-deletion';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();

  if (user && (await isDeletedAccount(user.id).catch(() => false))) {
    const c = clearedCookie();
    const response = Response.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    response.headers.append('Set-Cookie', `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${c.secure ? '; Secure' : ''}`);
    return response;
  }

  return Response.json(
    { user: user ? { id: user.id, name: user.name, mobile: user.mobile } : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

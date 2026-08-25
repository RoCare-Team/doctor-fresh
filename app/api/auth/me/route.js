// The signed-in user, read from the session cookie.
//
// The header asks for this from the browser rather than reading the cookie in
// the layout: touching cookies() in a server component opts the whole tree out
// of static rendering, which would turn all 703 prerendered pages into
// per-request renders.

import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();
  return Response.json(
    { user: user ? { id: user.id, name: user.name, mobile: user.mobile } : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

import { clearedAdminCookie, cookieHeader } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', cookieHeader(clearedAdminCookie()));
  return response;
}

import { clearedCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const c = clearedCookie();
  const response = Response.json({ ok: true });
  response.headers.append(
    'Set-Cookie',
    `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${c.secure ? '; Secure' : ''}`,
  );
  return response;
}

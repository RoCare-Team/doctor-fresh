// Every admin write goes through this, so an endpoint cannot be reached
// without a valid admin session.

import { getAdminSession } from '@/lib/admin/session';

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      admin: null,
      response: Response.json({ ok: false, error: 'Please sign in.' }, { status: 401 }),
    };
  }
  return { admin, response: null };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

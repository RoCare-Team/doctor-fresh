// Every admin write goes through this, so an endpoint cannot be reached
// without a valid admin session — and, given a section, without the right to
// act there.

import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/session';
import { can, homeFor, SECTIONS } from '@/lib/admin/access';

const ACTION_BY_METHOD = {
  GET: 'view', HEAD: 'view', POST: 'create', PUT: 'edit', PATCH: 'edit', DELETE: 'delete',
};

/**
 * `section` — e.g. 'products'. `action` defaults from the HTTP method
 * (POST create, PATCH/PUT edit, DELETE delete) when a request is passed.
 */
export async function requireAdmin(section, requestOrAction) {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      admin: null,
      response: Response.json({ ok: false, error: 'Please sign in.' }, { status: 401 }),
    };
  }

  if (section) {
    const sections = [].concat(section);
    const action = typeof requestOrAction === 'string'
      ? requestOrAction
      : ACTION_BY_METHOD[requestOrAction?.method] || 'view';
    if (!sections.some((s) => can(admin.access, s, action))) {
      const label = SECTIONS.find((s) => s.id === sections[0])?.label || 'this section';
      return {
        admin,
        response: Response.json(
          { ok: false, error: `Your account does not have permission to ${action} in ${label}. Ask an owner for access.` },
          { status: 403 },
        ),
      };
    }
  }
  return { admin, response: null };
}

/**
 * For admin pages: the signed-in admin if they may open `section`, otherwise
 * a redirect — to sign in, or to the no-access page.
 */
export async function requirePage(section) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  if (!can(admin.access, section)) {
    if (section === 'dashboard') {
      const home = homeFor(admin.access);
      if (home && home !== '/admin') redirect(home);
    }
    redirect(`/admin/no-access?section=${section}`);
  }
  return admin;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

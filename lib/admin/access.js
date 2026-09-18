// Who may do what in the admin area.
//
// Two things are granted to each admin user: the SECTIONS they can open and
// the ACTIONS they can take there (view / create / edit / delete). A role is a
// ready-made set of both; the checkboxes can then be adjusted per person.
//
// Pure data and helpers — shared by the server guards and the users screen.

export const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin' },
  { id: 'orders', label: 'Orders', href: '/admin/orders' },
  { id: 'products', label: 'Products', href: '/admin/products' },
  { id: 'categories', label: 'Categories', href: '/admin/categories' },
  { id: 'service_pages', label: 'Service pages', href: '/admin/service-pages' },
  { id: 'redirects', label: 'Redirects', href: '/admin/uniredirect' },
  { id: 'brochures', label: 'Brochures', href: '/admin/brochures' },
  { id: 'customers', label: 'Customers', href: '/admin/customers' },
  { id: 'enquiries', label: 'Enquiries', href: '/admin/enquiries' },
  { id: 'messages', label: 'Contact & partner messages', href: '/admin/messages' },
  { id: 'blogs', label: 'Blogs', href: '/admin/blogs' },
  { id: 'coupons', label: 'Coupons', href: '/admin/coupons' },
  { id: 'settings', label: 'Settings', href: '/admin/settings' },
  { id: 'users', label: 'Admin users', href: '/admin/users' },
];

export const ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
];

const ALL_SECTIONS = SECTIONS.map((s) => s.id);
const ALL_ACTIONS = ACTIONS.map((a) => a.id);
const allBut = (...ids) => ALL_SECTIONS.filter((id) => !ids.includes(id));

export const ROLES = [
  {
    id: 'owner', label: 'Owner', description: 'Everything, including adding and removing admin users.',
    sections: ALL_SECTIONS, actions: ALL_ACTIONS,
  },
  {
    id: 'admin', label: 'Admin', description: 'Everything except managing admin users.',
    sections: allBut('users'), actions: ALL_ACTIONS,
  },
  {
    id: 'manager', label: 'Manager', description: 'Runs the shop: orders, products, customers and enquiries. Cannot delete.',
    sections: ['dashboard', 'orders', 'products', 'categories', 'customers', 'enquiries', 'messages', 'brochures', 'coupons'],
    actions: ['view', 'create', 'edit'],
  },
  {
    id: 'sales', label: 'Sales', description: 'Orders, customers and every enquiry — can update, cannot delete.',
    sections: ['dashboard', 'orders', 'customers', 'enquiries', 'messages', 'brochures'],
    actions: ['view', 'edit'],
  },
  {
    id: 'seo', label: 'SEO', description: 'Page content and search listings: products, categories, service pages, redirects and blogs.',
    sections: ['dashboard', 'products', 'categories', 'service_pages', 'redirects', 'blogs'],
    actions: ALL_ACTIONS,
  },
  {
    id: 'writer', label: 'Content writer', description: 'Writes and edits blog posts only.',
    sections: ['blogs'], actions: ['view', 'create', 'edit'],
  },
  {
    id: 'viewer', label: 'Viewer', description: 'Can look at everything except users and settings, change nothing.',
    sections: allBut('users', 'settings'), actions: ['view'],
  },
];

export const roleInfo = (id) => ROLES.find((r) => r.id === id);

/**
 * The PHP panel's own role column: '1' is its master admin. Anyone without a
 * row in the new access table is treated by that — master as Owner, everyone
 * else as Manager — so existing logins keep working on day one.
 */
export function legacyAccess(phpRole) {
  const role = String(phpRole) === '1' ? roleInfo('owner') : roleInfo('manager');
  return { role: role.id, sections: [...role.sections], actions: [...role.actions], active: true };
}

/** Keeps only known ids, so a tampered request cannot invent a permission. */
export function cleanAccess({ role, sections, actions }) {
  const known = roleInfo(role) ? role : 'custom';
  return {
    role: known,
    sections: ALL_SECTIONS.filter((id) => (sections || []).includes(id)),
    actions: ALL_ACTIONS.filter((id) => (actions || []).includes(id)),
  };
}

/** Can this admin take `action` in `section`? Viewing is implied by any other right. */
export function can(access, section, action = 'view') {
  if (!access || access.active === false) return false;
  if (!access.sections?.includes(section)) return false;
  if (action === 'view') return access.actions?.length > 0;
  return access.actions?.includes(action);
}

/** Which section an admin URL belongs to — for the sidebar and the page guard. */
export function sectionForPath(pathname) {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/partners')) return 'messages';
  const match = SECTIONS
    .filter((s) => s.href !== '/admin' && pathname.startsWith(s.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.id || null;
}

/** Where to send someone who cannot see the dashboard. */
export function homeFor(access) {
  return SECTIONS.find((s) => can(access, s.id))?.href || null;
}

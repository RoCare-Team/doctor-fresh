'use client';

import { createContext, useContext } from 'react';
import { can } from '@/lib/admin/access';

// The signed-in admin's access, handed down from the admin frame so any
// button can ask whether to show itself. The server checks every request
// anyway — this only keeps people from seeing buttons they cannot use.
const AccessContext = createContext(null);

export function AdminAccessProvider({ access, children }) {
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}

/** `useCan()('products', 'delete')` → true / false. */
export function useCan() {
  const access = useContext(AccessContext);
  // Outside the admin frame (never expected) nothing is hidden; the server still decides.
  return (section, action = 'view') => (access ? can(access, section, action) : true);
}

/** Renders its children only when allowed; `fallback` otherwise. */
export function Can({
  section, action = 'view', fallback = null, children,
}) {
  const allowed = useCan()(section, action);
  return allowed ? children : fallback;
}

/** The note shown where a save button would be, for view-only access. */
export function ViewOnlyNote({ className = '' }) {
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-[13.5px] text-ink-500 ${className}`}>
      View only — your role cannot change this.
    </p>
  );
}

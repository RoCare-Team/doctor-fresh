'use client';

import { useEffect, useState } from 'react';

/**
 * The signed-in visitor, shared by every component that asks for it.
 *
 * The session lives in an httpOnly cookie, so the browser has to ask the server
 * who it is; reading it during render would make every page dynamic instead of
 * being served from the prerendered build. One request is made per page load
 * however many components need the answer, and it is re-read after signing in
 * or out.
 */

let cached; // undefined until answered, then the user or null
let inflight = null;
const listeners = new Set();

function load() {
  if (inflight) return inflight;

  inflight = fetch('/api/auth/me')
    .then((r) => r.json())
    .then((d) => d.user || null)
    .catch(() => null)
    .then((user) => {
      cached = user;
      inflight = null;
      listeners.forEach((fn) => fn(user));
      return user;
    });

  return inflight;
}

/** The session as a promise — for click handlers, which cannot wait on a render. */
export function whenSession() {
  return cached === undefined ? load() : Promise.resolve(cached);
}

/** Call after signing in or out so the header and the buttons agree. */
export function refreshSession() {
  cached = undefined;
  inflight = null;
  return load();
}

export function useSession() {
  const [user, setUser] = useState(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let live = true;
    const onChange = (next) => {
      if (!live) return;
      setUser(next);
      setLoading(false);
    };

    listeners.add(onChange);
    whenSession().then(onChange);

    return () => {
      live = false;
      listeners.delete(onChange);
    };
  }, []);

  return { user, loading };
}

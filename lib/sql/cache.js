// Shared read cache for the catalogue.
//
// The MySQL account is shared with the live PHP site and capped at 30
// connections, and that site regularly uses most of them — a query can be
// refused for a few seconds at a time.
//
// So a successful result is kept, and if a later refresh fails the previous
// one is served rather than the page erroring. That is still the site's own
// data, only a little older; nothing is invented. A failure with nothing
// cached still surfaces, because there is genuinely nothing to show.

const TTL_MS = Number(process.env.DB_CACHE_TTL_MS) || 60_000;

// How long a stale entry may stand in while the database is unreachable.
const GRACE_MS = Number(process.env.DB_CACHE_GRACE_MS) || 30 * 60_000;

const globalForCache = globalThis;
const store = (globalForCache.__dfCache ??= new Map());

/**
 * Returns the cached value, refreshing it when stale.
 *
 * `loader` must resolve to null when the database could not answer — that is
 * what tells this to fall back to the last good copy.
 */
export function cached(key, loader) {
  const entry = store.get(key);
  if (entry?.fresh && Date.now() - entry.at < TTL_MS) return entry.value;

  const value = loader().then(
    (result) => {
      if (result !== null && result !== undefined) {
        store.set(key, { at: Date.now(), value: Promise.resolve(result), fresh: true });
        return result;
      }

      // The database could not answer. Serve the last good copy if it is not
      // yet too old to be trustworthy.
      if (entry && Date.now() - entry.at < GRACE_MS) {
        // eslint-disable-next-line no-console
        console.warn(`[cache] ${key}: serving the last good copy, database unavailable`);
        store.set(key, { ...entry, fresh: false });
        return entry.value;
      }

      store.delete(key);
      return null;
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error(`[cache] ${key} failed:`, err.message);
      if (entry && Date.now() - entry.at < GRACE_MS) return entry.value;
      store.delete(key);
      return null;
    },
  );

  // Held straight away so concurrent renders share one round trip.
  store.set(key, { at: Date.now(), value, fresh: true });
  return value;
}

export function clearCache() {
  store.clear();
}

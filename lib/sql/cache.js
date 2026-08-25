// Shared in-memory cache for the read-only lookups.
//
// The MySQL host this site talks to is not always quick to answer — the
// account is shared with the live PHP site and connections occasionally time
// out. Without a cache a single blip would empty the catalogue and show an
// error page.
//
// So the last value that loaded successfully is kept. If a refresh fails, that
// value is served again: real data from the database, just a little older.
// Nothing is ever invented — an empty cache and a failed load still surface as
// an error, which is the honest answer.

const TTL_MS = Number(process.env.DB_CACHE_TTL_MS) || 60_000;

const globalForCache = globalThis;
globalForCache.__dfCache ??= new Map();
const store = globalForCache.__dfCache;

/**
 * @param key     cache slot
 * @param loader  async () => value | null   (null means "the database did not answer")
 */
export function cached(key, loader) {
  const entry = store.get(key);

  // Fresh enough — hand back what we have, in flight or settled.
  if (entry?.pending) return entry.pending;
  if (entry && Date.now() - entry.at < TTL_MS) return Promise.resolve(entry.value);

  const pending = loader()
    .then((value) => {
      if (value === null || value === undefined) {
        // Failed refresh: keep serving the last good value rather than nothing.
        if (entry?.value !== undefined) {
          store.set(key, { ...entry, pending: null });
          return entry.value;
        }
        store.delete(key);
        return null;
      }

      store.set(key, { at: Date.now(), value, pending: null });
      return value;
    })
    .catch((err) => {
      console.error(`[cache] ${key} failed:`, err.message);
      if (entry?.value !== undefined) {
        store.set(key, { ...entry, pending: null });
        return entry.value;
      }
      store.delete(key);
      return null;
    });

  store.set(key, { ...(entry || {}), pending });
  return pending;
}

export function clearCache(key) {
  if (key) store.delete(key);
  else store.clear();
}

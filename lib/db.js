// MySQL connection layer for the existing DoctorFresh database.
//
// The database itself is NOT modified by this app — no migrations, no schema
// changes, no writes. Everything here is read-only SELECT access so the site
// can be served from the same SQL data the current PHP site uses.
//
// If the DB env vars are absent (or a query fails), every catalog function
// falls back to the extracted static data in /data. The site therefore keeps
// working exactly as it does today until real credentials are supplied.

import mysql from 'mysql2/promise';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL,
  DB_CONNECTION_LIMIT,
} = process.env;

/** True only when enough env vars exist to attempt a connection. */
export function isDbEnabled() {
  return Boolean(DB_HOST && DB_USER && DB_NAME);
}

// One pool per process. Next.js reloads modules in dev, so it is stashed on
// globalThis to avoid leaking a pool on every hot reload.
const globalForDb = globalThis;

function getPool() {
  if (!isDbEnabled()) return null;
  if (!globalForDb.__dfPool) {
    globalForDb.__dfPool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT) || 3306,
      user: DB_USER,
      password: DB_PASSWORD || '',
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(DB_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
      ...(DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return globalForDb.__dfPool;
}

/**
 * Run a read-only query. Returns rows, or null when the DB is unavailable —
 * callers treat null as "use the static fallback" rather than as an error, so a
 * database outage degrades to the bundled catalogue instead of a 500 page.
 */
export async function query(sql, params = []) {
  const pool = getPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    // Logged once per failure so a bad credential or a renamed column is
    // visible in the server log without taking the page down.
    console.error('[db] query failed:', err.code || err.message);
    return null;
  }
}

/** Single row helper. */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows?.[0] ?? null;
}

/** Connectivity probe used by the health check and the introspection script. */
export async function ping() {
  const pool = getPool();
  if (!pool) return { ok: false, reason: 'DB env vars not set' };
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return { ok: true, database: DB_NAME, host: DB_HOST };
  } catch (err) {
    return { ok: false, reason: err.code || err.message };
  }
}

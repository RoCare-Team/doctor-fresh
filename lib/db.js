// MySQL connection layer for the existing DoctorFresh database.
//
// The schema itself is NOT modified by this app — no migrations, no ALTERs, no
// new tables. The catalogue is read-only.
//
// The one exception is sign-in: `mutate()` writes rows to the two tables the
// PHP site already uses for it (`users` and `otp`), exactly as that site does.
// Nothing else writes.
//
// A failed read returns null. Callers serve the last value that loaded
// successfully (see lib/sql/cache.js) rather than inventing anything.

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
      // The live PHP site shares this MySQL account, which is capped at 30
      // concurrent connections server-wide. A small pool leaves that site room
      // to work; going wider earns ER_USER_LIMIT_REACHED, not more speed.
      connectionLimit: Number(DB_CONNECTION_LIMIT) || 3,
      maxIdle: 2,
      // The server closes idle connections after 60s; drop them first so a
      // stale socket is never handed to a query.
      idleTimeout: 30_000,
      enableKeepAlive: true,
      queueLimit: 0,
      charset: 'utf8mb4',
      // The host regularly takes 3-4s to complete a handshake.
      connectTimeout: 20_000,
      dateStrings: true,
      ...(DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return globalForDb.__dfPool;
}

/**
 * Errors worth retrying: the shared account ran out of connections, or a
 * pooled socket had already been closed by the server's 60s idle timeout.
 * Everything else (bad SQL, missing column) fails immediately.
 */
const RETRYABLE = new Set([
  'ER_USER_LIMIT_REACHED',
  'ER_CON_COUNT_ERROR',
  'ER_TOO_MANY_USER_CONNECTIONS',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ETIMEDOUT',
]);

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export async function query(sql, params = [], attempt = 0) {
  const pool = getPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    if (RETRYABLE.has(err.code) && attempt < 5) {
      // Back off and try again — the contention is usually momentary.
      await wait(150 * 2 ** attempt);
      return query(sql, params, attempt + 1);
    }
    // Logged once per failure so a bad credential or a renamed column is
    // visible in the server log without taking the page down.
    console.error('[db] query failed:', err.code || err.message);
    return null;
  }
}

/**
 * Write query, for sign-in only (`users` and `otp`).
 *
 * Unlike `query()` this rethrows: a failed INSERT must surface as an error the
 * caller reports to the visitor, never as a silent "account created".
 */
export async function mutate(sql, params = []) {
  const pool = getPool();
  if (!pool) throw new Error('Database is not configured');

  const [result] = await pool.execute(sql, params);
  return result;
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

/**
 * Prints the real schema of the existing DoctorFresh database so the mapping in
 * lib/sql/schema.js can be reconciled with it.
 *
 * Read-only: it queries information_schema and takes one sample row per table.
 * Nothing is created, altered or deleted.
 *
 *   node -r dotenv/config _audit/introspect-db.js          (or set the vars inline)
 *   DB_HOST=... DB_USER=... DB_NAME=... node _audit/introspect-db.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Read .env.local without adding a dotenv dependency.
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL } = process.env;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error('Missing DB_HOST / DB_USER / DB_NAME. Fill .env.local (see .env.example).');
  process.exit(1);
}

(async () => {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD || '',
    database: DB_NAME,
    dateStrings: true,
    ...(DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const [tables] = await conn.execute(
    `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRows
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [DB_NAME],
  );

  const [columns] = await conn.execute(
    `SELECT TABLE_NAME AS tbl, COLUMN_NAME AS col, COLUMN_TYPE AS type, COLUMN_KEY AS keyType
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [DB_NAME],
  );

  const byTable = new Map();
  for (const c of columns) {
    if (!byTable.has(c.tbl)) byTable.set(c.tbl, []);
    byTable.get(c.tbl).push(c);
  }

  const report = { database: DB_NAME, tables: [] };

  console.log(`\nDatabase: ${DB_NAME}  (${tables.length} tables)\n`);

  for (const t of tables) {
    const cols = byTable.get(t.name) || [];
    let sample = null;
    try {
      const [rows] = await conn.query(`SELECT * FROM \`${t.name}\` LIMIT 1`);
      sample = rows[0] || null;
    } catch {
      /* view or permission issue — columns are still useful */
    }

    console.log(`── ${t.name}  (~${t.approxRows ?? '?'} rows)`);
    console.log(`   ${cols.map((c) => `${c.col}:${c.type}${c.keyType === 'PRI' ? ' PK' : ''}`).join(', ')}`);
    console.log('');

    report.tables.push({
      name: t.name,
      approxRows: t.approxRows,
      columns: cols.map((c) => ({ name: c.col, type: c.type, key: c.keyType })),
      sample: sample
        ? Object.fromEntries(
            Object.entries(sample).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 160) : v]),
          )
        : null,
    });
  }

  const out = path.join(__dirname, 'db-schema.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Full schema + one sample row per table written to ${path.relative(process.cwd(), out)}`);

  await conn.end();
})().catch((err) => {
  console.error('Introspection failed:', err.code || err.message);
  process.exit(1);
});
